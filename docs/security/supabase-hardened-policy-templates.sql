-- ============================================================================
-- Hardened RLS Policy Templates
-- ============================================================================
-- Copy/adapt these templates per table. Keep table/column names aligned.

-- ---------------------------------------------------------------------------
-- 1) USER-OWNED RESOURCE TEMPLATE
-- Example table shape: public.user_resource(id, user_id, ...)
-- ---------------------------------------------------------------------------

-- Enable RLS
alter table public.user_resource enable row level security;

-- Optional baseline deny (defense in depth)
drop policy if exists user_resource_deny_all on public.user_resource;
create policy user_resource_deny_all
on public.user_resource
as restrictive
for all
to anon, authenticated
using (false)
with check (false);

-- Allow owner read
drop policy if exists user_resource_owner_select on public.user_resource;
create policy user_resource_owner_select
on public.user_resource
for select
to authenticated
using (user_id = (select auth.uid()));

-- Allow owner insert
drop policy if exists user_resource_owner_insert on public.user_resource;
create policy user_resource_owner_insert
on public.user_resource
for insert
to authenticated
with check (user_id = (select auth.uid()));

-- Allow owner update
drop policy if exists user_resource_owner_update on public.user_resource;
create policy user_resource_owner_update
on public.user_resource
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- Allow owner delete
drop policy if exists user_resource_owner_delete on public.user_resource;
create policy user_resource_owner_delete
on public.user_resource
for delete
to authenticated
using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 2) ADMIN RESOURCE TEMPLATE
-- Example table shape: public.admin_resource(...)
-- Requires helper: public.is_admin_user(uuid)
-- ---------------------------------------------------------------------------

alter table public.admin_resource enable row level security;

drop policy if exists admin_resource_select on public.admin_resource;
create policy admin_resource_select
on public.admin_resource
for select
to authenticated
using (is_admin_user((select auth.uid())));

drop policy if exists admin_resource_insert on public.admin_resource;
create policy admin_resource_insert
on public.admin_resource
for insert
to authenticated
with check (is_admin_user((select auth.uid())));

drop policy if exists admin_resource_update on public.admin_resource;
create policy admin_resource_update
on public.admin_resource
for update
to authenticated
using (is_admin_user((select auth.uid())))
with check (is_admin_user((select auth.uid())));

drop policy if exists admin_resource_delete on public.admin_resource;
create policy admin_resource_delete
on public.admin_resource
for delete
to authenticated
using (is_admin_user((select auth.uid())));

-- ---------------------------------------------------------------------------
-- 3) SERVICE RESOURCE TEMPLATE (server-only write path)
-- Example table shape: public.service_resource(...)
-- ---------------------------------------------------------------------------

alter table public.service_resource enable row level security;

-- Block all direct client access
drop policy if exists service_resource_deny_client on public.service_resource;
create policy service_resource_deny_client
on public.service_resource
as restrictive
for all
to anon, authenticated
using (false)
with check (false);

-- Optional explicit service-role allowance (if your role strategy requires it)
drop policy if exists service_resource_service_role_insert on public.service_resource;
create policy service_resource_service_role_insert
on public.service_resource
for insert
to service_role
with check (true);

drop policy if exists service_resource_service_role_select on public.service_resource;
create policy service_resource_service_role_select
on public.service_resource
for select
to service_role
using (true);

-- ---------------------------------------------------------------------------
-- 4) STORAGE OWNER PATH TEMPLATE
-- Path convention: <bucket>/<owner_id>/<filename>
-- ---------------------------------------------------------------------------

-- INSERT owner-only
create policy storage_owner_insert
on storage.objects
as restrictive
for insert
to authenticated
with check (
  bucket_id = 'your-bucket'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- SELECT owner-only (or add admin bypass as needed)
create policy storage_owner_select
on storage.objects
as restrictive
for select
to authenticated
using (
  bucket_id = 'your-bucket'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
