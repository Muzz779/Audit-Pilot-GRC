-- ============================================================
-- AuditPilot — Migration 004: tenant isolation
-- Run in the Supabase SQL editor, AFTER the code that stops relying on the old
-- rules is live. Safe to run more than once.
--
-- Closes four holes found by testing the live site with a normal account:
--   1. Any signed-in user could list every organisation's evidence files.
--      The old rule compared the user with their own organisation, which is
--      always true, so it never limited anything.
--   2. Any signed-in user could read the organisations table.
--   3. Any signed-in user could change their own profile's organisation_id,
--      role or is_platform_admin, and so join another organisation.
--   4. Anyone could upload into the evidence, logos and avatars buckets.
-- ============================================================

-- ── 1 and 4: evidence files belong to the organisation in their path ──
-- Paths are <organisation_id>/<timestamp>-<filename>. Drops every rule on the
-- evidence bucket by content, because the live rules can differ from schema.sql.
do $$
declare
  rule record;
begin
  for rule in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (qual ilike '%evidence%' or with_check ilike '%evidence%')
  loop
    execute format('drop policy %I on storage.objects', rule.policyname);
  end loop;
end $$;

create policy "Org members can view evidence files" on storage.objects
  for select to authenticated
  using (bucket_id = 'evidence' and (storage.foldername(name))[1] = get_user_org_id()::text);

create policy "Members can upload evidence" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'evidence' and (storage.foldername(name))[1] = get_user_org_id()::text);

drop policy if exists "Owners can upload logos" on storage.objects;
create policy "Owners can upload logos" on storage.objects
  for insert to authenticated with check (bucket_id = 'logos');

drop policy if exists "Users can upload their avatar" on storage.objects;
create policy "Users can upload their avatar" on storage.objects
  for insert to authenticated with check (bucket_id = 'avatars');

-- ── 2: an organisation is visible only to its members ─────────────────
do $$
declare
  rule record;
begin
  for rule in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'organisations' and cmd = 'SELECT'
  loop
    execute format('drop policy %I on public.organisations', rule.policyname);
  end loop;
end $$;

create policy "Users can view their own organisation" on organisations
  for select using (id = get_user_org_id() or is_platform_admin());

-- ── 3: protect the profile fields that grant access ───────────────────
-- Row rules can't limit columns, so a trigger does. Requests with no signed-in
-- user (server routes using the service role, and this SQL editor) are trusted.
create or replace function protect_profile_access_fields()
returns trigger as $$
declare
  caller_role user_role;
  caller_org uuid;
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.is_platform_admin is distinct from old.is_platform_admin then
    raise exception 'is_platform_admin cannot be changed from the app';
  end if;

  if new.organisation_id is not distinct from old.organisation_id
     and new.role is not distinct from old.role then
    return new;
  end if;

  select role, organisation_id into caller_role, caller_org
  from profiles where id = auth.uid();

  -- Signup: a user with no organisation may take ownership of a new one, which
  -- is one with no members yet. Existing organisations can only be joined
  -- through an invitation, which the server applies with the service role.
  if old.id = auth.uid() and old.organisation_id is null and new.organisation_id is not null then
    if new.role = 'owner'
       and not exists (select 1 from profiles where organisation_id = new.organisation_id) then
      return new;
    end if;
    raise exception 'Organisations can only be joined by invitation';
  end if;

  -- Team management: an owner or admin may change or remove other members of
  -- their own organisation, but never an owner and never themselves.
  if caller_role in ('owner', 'admin')
     and old.id <> auth.uid()
     and old.organisation_id = caller_org
     and old.role <> 'owner'
     and new.role <> 'owner'
     and (new.organisation_id is null or new.organisation_id = caller_org) then
    return new;
  end if;

  raise exception 'Not allowed to change organisation or role';
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists protect_profile_access_fields on profiles;
create trigger protect_profile_access_fields
  before update on profiles
  for each row execute function protect_profile_access_fields();
