-- Fix: Add explicit DENY policies for non-super-admin access to admin_users
-- This prevents admin email harvesting for phishing attacks

-- Drop existing policies and recreate with stronger protection
DROP POLICY IF EXISTS "Deny all delete operations on admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Only super admins can view admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Super admins can insert admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Super admins can update admin users" ON public.admin_users;
DROP POLICY IF EXISTS "deny_anonymous_admin_access" ON public.admin_users;
DROP POLICY IF EXISTS "deny_regular_user_admin_access" ON public.admin_users;

-- Explicit DENY policy for anonymous users (restrictive - blocks before other policies)
CREATE POLICY "deny_anonymous_admin_access"
ON public.admin_users
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- Explicit DENY policy for regular authenticated users who are not super_admin
-- This is a restrictive policy that blocks access unless user is super_admin
CREATE POLICY "super_admin_only_select"
ON public.admin_users
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "super_admin_only_insert"
ON public.admin_users
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "super_admin_only_update"
ON public.admin_users
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Deny all deletes - admin users should be deactivated, not deleted
CREATE POLICY "deny_admin_delete"
ON public.admin_users
FOR DELETE
USING (false);