-- Harden RLS on public.admin_users to prevent unauthorized access and self-escalation

-- 1) Ensure RLS is enabled
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- 2) Drop overly permissive INSERT policy if it exists
DROP POLICY IF EXISTS "Users can create admin profile" ON public.admin_users;

-- 3) Insert policy: only existing admins can insert new admin users
CREATE POLICY "Admins can insert admin users"
ON public.admin_users
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_user(auth.uid()));

-- 4) Select policy: keep self-access, and allow admins to view all
-- (Self-access policy already exists per project state)
CREATE POLICY IF NOT EXISTS "Admins can select all admin users"
ON public.admin_users
FOR SELECT
TO authenticated
USING (public.is_admin_user(auth.uid()));

-- 5) Update policy: keep self-updates, and allow admins to update all
CREATE POLICY IF NOT EXISTS "Admins can update all admin users"
ON public.admin_users
FOR UPDATE
TO authenticated
USING (public.is_admin_user(auth.uid()));

-- 6) Strengthen helper function to consider role values explicitly
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