-- Undo for migration 004. Restores the 15 access rules read from the live
-- database on 2026-11-04, immediately before the migration ran.
-- This reopens the isolation holes. Use it only if the migration breaks the app.

drop trigger if exists protect_profile_access_fields on profiles;
drop function if exists protect_profile_access_fields();

drop policy if exists "Users can view their own organisation" on organisations;
create policy "Users can view their organisations" on organisations
  for select to authenticated using (true);
create policy "Users can view their own organisation" on organisations
  for select using ((id = get_user_org_id()) or is_platform_admin());

drop policy if exists "Org members can view evidence files" on storage.objects;
create policy "Org members can view evidence files" on storage.objects
  for select using (
    (bucket_id = 'evidence'::text)
    and (auth.uid() in (select profiles.id from profiles where (profiles.organisation_id = get_user_org_id())))
  );

drop policy if exists "Members can upload evidence" on storage.objects;
create policy "Members can upload evidence" on storage.objects
  for insert with check (bucket_id = 'evidence'::text);

drop policy if exists "Owners can upload logos" on storage.objects;
create policy "Owners can upload logos" on storage.objects
  for insert with check (bucket_id = 'logos'::text);

drop policy if exists "Users can upload their avatar" on storage.objects;
create policy "Users can upload their avatar" on storage.objects
  for insert with check (bucket_id = 'avatars'::text);
