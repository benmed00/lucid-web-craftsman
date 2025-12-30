-- =====================================================
-- FIX 1: Newsletter Subscriptions - Strengthen ownership validation
-- =====================================================

-- Drop existing policies that may be too permissive
DROP POLICY IF EXISTS "newsletter_select_policy" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "deny_anonymous_newsletter_read" ON public.newsletter_subscriptions;

-- Create a more restrictive select policy:
-- - Users can ONLY see their own subscription (matched by auth email)
-- - Admins can see all for management purposes
CREATE POLICY "newsletter_select_strict" ON public.newsletter_subscriptions
FOR SELECT USING (
  -- User can only see their own subscription (verified via auth.jwt email)
  (email = (SELECT auth.jwt() ->> 'email'))
  OR 
  -- Only super_admins can view all subscriptions (not regular admins)
  has_role((SELECT auth.uid()), 'super_admin')
);

-- =====================================================
-- FIX 2: Contact Messages - Restrict to super_admins only
-- =====================================================

-- Drop the overly permissive admin policy
DROP POLICY IF EXISTS "secure_admin_contact_access" ON public.contact_messages;

-- Create stricter policy - only super_admins can read contact messages
CREATE POLICY "super_admin_contact_access" ON public.contact_messages
FOR SELECT USING (
  has_role((SELECT auth.uid()), 'super_admin')
);

-- Update the update policy to also require super_admin
DROP POLICY IF EXISTS "admin_contact_update" ON public.contact_messages;
CREATE POLICY "super_admin_contact_update" ON public.contact_messages
FOR UPDATE USING (
  has_role((SELECT auth.uid()), 'super_admin')
);

-- Update the delete policy to also require super_admin
DROP POLICY IF EXISTS "admin_contact_delete" ON public.contact_messages;
CREATE POLICY "super_admin_contact_delete" ON public.contact_messages
FOR DELETE USING (
  has_role((SELECT auth.uid()), 'super_admin')
);

-- =====================================================
-- FIX 3: Audit Logs - Restrict reading and insertion
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- Only super_admins can view audit logs (not regular admins)
CREATE POLICY "super_admin_view_audit_logs" ON public.audit_logs
FOR SELECT USING (
  has_role((SELECT auth.uid()), 'super_admin')
);

-- Restrict audit log insertion to authenticated users only (not anonymous)
-- Also add validation that user_id must match the inserting user or be null (for system)
CREATE POLICY "authenticated_insert_audit_logs" ON public.audit_logs
FOR INSERT WITH CHECK (
  -- Must be authenticated (not anonymous)
  is_authenticated_user()
  AND (
    -- user_id must be null (system log) or match the current user
    user_id IS NULL 
    OR user_id = (SELECT auth.uid())
    -- Or super_admin can insert logs for any user (for system operations)
    OR has_role((SELECT auth.uid()), 'super_admin')
  )
);

-- Log this security fix
INSERT INTO public.audit_logs (action, resource_type, resource_id, new_values)
VALUES (
  'SECURITY_POLICIES_STRENGTHENED',
  'database_security',
  'rls_policies',
  jsonb_build_object(
    'fixes', ARRAY[
      'newsletter_subscriptions: restricted to own email or super_admin',
      'contact_messages: restricted to super_admin only',
      'audit_logs: restricted viewing to super_admin, insertion to authenticated users'
    ],
    'timestamp', now()
  )
);