-- Re-apply hardened RLS on public.admin_users without IF NOT EXISTS

-- 1) Ensure RLS is enabled
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- 2) Drop and replace INSERT policy
DROP POLICY IF EXISTS "Users can create admin profile" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can insert admin users" ON public.admin_users;
CREATE POLICY "Admins can insert admin users"
ON public.admin_users
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_user(auth.uid()));

-- 3) Drop and replace admin-wide SELECT policy
DROP POLICY IF EXISTS "Admins can select all admin users" ON public.admin_users;
CREATE POLICY "Admins can select all admin users"
ON public.admin_users
FOR SELECT
TO authenticated
USING (public.is_admin_user(auth.uid()));

-- 4) Drop and replace admin-wide UPDATE policy
DROP POLICY IF EXISTS "Admins can update all admin users" ON public.admin_users;
CREATE POLICY "Admins can update all admin users"
ON public.admin_users
FOR UPDATE
TO authenticated
USING (public.is_admin_user(auth.uid()));

-- 5) Strengthen helper function to consider role values explicitly
CREATE OR REPLACE FUNCTION public.is_admin_user(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = user_uuid AND role IN ('admin','super-admin')
  );
$$;