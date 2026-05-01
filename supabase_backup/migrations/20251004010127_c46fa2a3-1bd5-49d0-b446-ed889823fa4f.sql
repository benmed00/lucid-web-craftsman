-- ====================================
-- FIX: Remove Recursive RLS Policy Checks
-- ====================================
-- This migration fixes policies that still recursively check admin_users
-- instead of using the new has_role() security definer function

-- 1. Fix admin_users policies
DROP POLICY IF EXISTS "Super admins can insert admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Super admins can update admin users" ON public.admin_users;

CREATE POLICY "Super admins can insert admin users" 
ON public.admin_users
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can update admin users" 
ON public.admin_users
FOR UPDATE 
USING (public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- 2. Fix security_config policy
DROP POLICY IF EXISTS "Super admins can manage security config" ON public.security_config;

CREATE POLICY "Super admins can manage security config" 
ON public.security_config
FOR ALL 
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- 3. Fix payments policy
DROP POLICY IF EXISTS "Super admins can view all payments" ON public.payments;

CREATE POLICY "Super admins can view all payments" 
ON public.payments
FOR SELECT 
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Log the fix
INSERT INTO public.audit_logs (
  user_id, action, resource_type, resource_id, new_values
) VALUES (
  auth.uid(),
  'SECURITY_POLICY_FIX_APPLIED',
  'system',
  'remove_recursive_policies',
  jsonb_build_object(
    'migration', 'remove_recursive_rls_checks',
    'timestamp', NOW(),
    'description', 'Fixed recursive RLS policy checks - all policies now use has_role() function',
    'tables_updated', ARRAY['admin_users', 'security_config', 'payments']
  )
);