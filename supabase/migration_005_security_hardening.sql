-- ============================================================
-- AuditPilot — Migration 005: security hardening (12 Nov 2026)
-- ============================================================
-- Run once in the Supabase SQL editor, AFTER the app code that ships with it
-- is live (the app now writes findings and audit runs with the service role,
-- so blocking browser writes here doesn't break anything). Safe to re-run.
--
--   1. Findings, finding history and audit runs: browsers can read their own
--      organisation's rows but can no longer write them. Before this, a member
--      could write straight to the database and mark a finding "accepted" with
--      someone else's name as reviewer.
--   2. Audit log: a user can only add entries in their own name.
--   3. Notifications: only to people in your own organisation.
--   4. Every new organisation gets a starter plan row from the database
--      itself. The browser could never write this row, which is why some
--      organisations had none. Existing organisations without one get one.
--   5. Subscriptions: only the server (service role) and platform admins write.
--   6. Logo and avatar uploads: only into your own folder, images only.
--   7. Helper functions that run with raised rights get a fixed search_path.
--
-- Not changed here, on purpose: the "anyone can create an organisation" rule
-- (includes anon). Signup may rely on it; test signup before removing anon.
-- ============================================================

-- ── 1: findings, finding_history, audit_runs are read-only for browsers ──
do $$
declare
  t text;
  rule record;
begin
  foreach t in array array['findings', 'finding_history', 'audit_runs'] loop
    for rule in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', rule.policyname, t);
    end loop;
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "Org members can view %s" on public.%I for select to authenticated using (organisation_id = get_user_org_id() or is_platform_admin())',
      t, t);
    execute format('revoke insert, update, delete on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- ── 2: audit log entries only in your own name ────────────────────────
drop policy if exists "System can insert audit logs" on audit_logs;
create policy "System can insert audit logs" on audit_logs
  for insert to authenticated
  with check (organisation_id = get_user_org_id() and user_id = auth.uid());

-- ── 3: notifications only to members of your own organisation ────────
drop policy if exists "System can create notifications" on notifications;
create policy "System can create notifications" on notifications
  for insert to authenticated
  with check (
    organisation_id = get_user_org_id()
    and user_id in (select id from profiles where organisation_id = get_user_org_id())
  );

-- ── 4: starter plan row for every organisation ───────────────────────
create or replace function create_starter_subscription()
returns trigger as $$
begin
  insert into subscriptions (organisation_id, tier, status)
  values (new.id, 'starter', 'active')
  on conflict (organisation_id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_organisation_created_subscription on organisations;
create trigger on_organisation_created_subscription
  after insert on organisations
  for each row execute function create_starter_subscription();

insert into subscriptions (organisation_id, tier, status)
select o.id, 'starter', 'active'
from organisations o
where not exists (select 1 from subscriptions s where s.organisation_id = o.id);

-- ── 5: only the server and platform admins write subscriptions ──────
do $$
declare
  rule record;
begin
  for rule in select policyname from pg_policies
              where schemaname = 'public' and tablename = 'subscriptions' and cmd <> 'SELECT' loop
    execute format('drop policy %I on public.subscriptions', rule.policyname);
  end loop;
end $$;
create policy "System can manage subscriptions" on subscriptions
  for all to authenticated
  using (is_platform_admin()) with check (is_platform_admin());

-- ── 6: logo and avatar uploads only into your own folder ─────────────
drop policy if exists "Owners can upload logos" on storage.objects;
create policy "Owners can upload logos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = get_user_org_id()::text);

drop policy if exists "Users can upload their avatar" on storage.objects;
create policy "Users can upload their avatar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- No SVG (it can carry scripts) in the public image buckets.
update storage.buckets
  set allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
  where id in ('logos', 'avatars');

-- ── 7: fixed search_path on functions that run with raised rights ────
alter function get_user_org_id() set search_path = public;
alter function is_platform_admin() set search_path = public;
alter function get_user_role() set search_path = public;
alter function handle_new_user() set search_path = public;

-- ── Check (run after; each should return what's described) ──────────
-- Policies on the three audit tables: one SELECT policy each.
--   select tablename, policyname, cmd from pg_policies
--   where tablename in ('findings','finding_history','audit_runs');
-- Every organisation has a plan row (should return 0):
--   select count(*) from organisations o
--   where not exists (select 1 from subscriptions s where s.organisation_id = o.id);
