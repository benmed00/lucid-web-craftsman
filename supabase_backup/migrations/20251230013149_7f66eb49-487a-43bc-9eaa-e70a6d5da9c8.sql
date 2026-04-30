-- =====================================================
-- FIX: contact_messages SELECT access - admin only
-- =====================================================

-- Drop the flawed policy that allows any authenticated user to SELECT
DROP POLICY IF EXISTS "deny_public_contact_access" ON public.contact_messages;

-- The secure_admin_contact_access policy already exists and properly restricts to admins:
-- USING (is_admin_user(auth.uid()))
-- This is now the ONLY SELECT policy, so only admins can view contact messages