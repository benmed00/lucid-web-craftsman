-- Consolidate and harden RLS policies on admin_users to prevent unintended exposure

-- 1) Ensure RLS is enabled (idempotent)
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- 2) Drop overlapping/legacy policies if they exist
DROP POLICY IF EXISTS "Admin users can view their own data" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can select all admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Admin users can update their own data" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can update all admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can insert admin users" ON public.admin_users;

-- 3) Create consolidated policies
-- SELECT: Only the row owner OR any authenticated admin can read rows
CREATE POLICY "Select own row or any as admin"
ON public.admin_users
FOR SELECT
USING (
  auth.uid() = user_id
  OR public.is_admin_user(auth.uid())
);

-- UPDATE: Only the row owner OR any authenticated admin can update rows
CREATE POLICY "Update own row or any as admin"
ON public.admin_users
FOR UPDATE
USING (
  auth.uid() = user_id
  OR public.is_admin_user(auth.uid())
);

-- INSERT: Only authenticated admins can create admin rows
CREATE POLICY "Admins can insert admin users"
ON public.admin_users
FOR INSERT
WITH CHECK (
  public.is_admin_user(auth.uid())
);
