-- =====================================================
-- TASK 1: Add user as admin
-- =====================================================

-- Add the user to user_roles as admin
INSERT INTO public.user_roles (user_id, role, granted_by)
VALUES (
  '26ca32b0-96d6-461e-ab6d-6d04491bf369'::uuid,
  'admin'::app_role,
  '26ca32b0-96d6-461e-ab6d-6d04491bf369'::uuid  -- Self-granted for initial setup
)
ON CONFLICT (user_id, role) DO NOTHING;

-- Also add to admin_users table for compatibility
INSERT INTO public.admin_users (user_id, email, name, role)
VALUES (
  '26ca32b0-96d6-461e-ab6d-6d04491bf369'::uuid,
  'benyakoub.fr+rifstraw@gmail.com',
  'Rif Straw Admin',
  'admin'
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- TASK 2: Fix audit_logs INSERT policy - tighten NULL user_id
-- =====================================================

-- Drop the existing policy
DROP POLICY IF EXISTS "authenticated_insert_audit_logs" ON public.audit_logs;

-- Create stricter policy: NULL user_id only allowed for super_admins (system operations)
CREATE POLICY "authenticated_insert_audit_logs" ON public.audit_logs
FOR INSERT WITH CHECK (
  -- Must be authenticated (not anonymous)
  is_authenticated_user()
  AND (
    -- Regular users: user_id MUST match their own id (no NULL allowed)
    user_id = (SELECT auth.uid())
    -- Super admins can insert with NULL user_id (for system operations)
    OR (user_id IS NULL AND has_role((SELECT auth.uid()), 'super_admin'))
    -- Super admins can also insert for any user
    OR has_role((SELECT auth.uid()), 'super_admin')
  )
);

-- =====================================================
-- TASK 3: Verify and strengthen profiles RLS
-- The current policy is: (id = auth.uid()) OR is_user_admin()
-- This is correct - users can only see their own profile
-- Let's add an extra safeguard
-- =====================================================

-- Drop and recreate profiles_select_policy to be more explicit
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;

CREATE POLICY "profiles_select_strict" ON public.profiles
FOR SELECT USING (
  -- Users can ONLY see their own profile
  (id = (SELECT auth.uid()))
  -- Admins can see all for customer support
  OR is_user_admin((SELECT auth.uid()))
);

-- =====================================================
-- TASK 4: contact_messages already restricted to super_admin
-- Verify by checking existing policies - they look correct
-- Add a note in audit log
-- =====================================================

-- Log security verification
INSERT INTO public.audit_logs (action, resource_type, resource_id, new_values)
VALUES (
  'SECURITY_POLICIES_VERIFIED',
  'database_security',
  'rls_policies',
  jsonb_build_object(
    'verified_tables', ARRAY[
      'profiles: users can only see own profile',
      'contact_messages: super_admin only access',
      'audit_logs: tightened NULL user_id restriction'
    ],
    'admin_added', 'benyakoub.fr+rifstraw@gmail.com',
    'timestamp', now()
  )
);