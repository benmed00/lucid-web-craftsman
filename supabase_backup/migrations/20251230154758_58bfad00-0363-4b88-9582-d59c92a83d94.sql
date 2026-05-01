-- Fix admin_users SELECT policy to allow admins to read their own record
-- This is needed for the useAdminAuth hook to work properly

-- Drop the restrictive super_admin only policy
DROP POLICY IF EXISTS "super_admin_only_select" ON public.admin_users;

-- Create a policy that allows:
-- 1. Super admins to see all admin users (for management)
-- 2. Admins to see their own record (for authentication check)
CREATE POLICY "admin_users_select" ON public.admin_users
FOR SELECT USING (
  (user_id = (SELECT auth.uid())) -- Admins can see their own record
  OR has_role((SELECT auth.uid()), 'super_admin') -- Super admins can see all
);

-- Log this fix
INSERT INTO public.audit_logs (action, resource_type, resource_id, new_values)
VALUES (
  'ADMIN_USERS_POLICY_FIX',
  'database_security',
  'admin_users_select',
  jsonb_build_object(
    'fix', 'Allow admins to read their own record for authentication',
    'timestamp', now()
  )
);