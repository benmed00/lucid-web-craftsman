-- Tighten admin_users RLS to admin-only access for SELECT/UPDATE

-- Drop previous consolidated policies
DROP POLICY IF EXISTS "Select own row or any as admin" ON public.admin_users;
DROP POLICY IF EXISTS "Update own row or any as admin" ON public.admin_users;

-- Create stricter policies limited to authenticated admins only
CREATE POLICY "Admins can select admin users"
ON public.admin_users
FOR SELECT
USING (
  public.is_admin_user(auth.uid())
);

CREATE POLICY "Admins can update admin users"
ON public.admin_users
FOR UPDATE
USING (
  public.is_admin_user(auth.uid())
);

-- Keep INSERT admin-only (already exists from prior migration). Recreate defensively to ensure it's present.
DROP POLICY IF EXISTS "Admins can insert admin users" ON public.admin_users;
CREATE POLICY "Admins can insert admin users"
ON public.admin_users
FOR INSERT
WITH CHECK (
  public.is_admin_user(auth.uid())
);
