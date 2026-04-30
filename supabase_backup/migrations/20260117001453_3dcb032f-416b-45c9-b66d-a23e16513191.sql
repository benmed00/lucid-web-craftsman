-- =====================================================
-- FIX: contact_messages - Consolidate and secure all policies
-- =====================================================

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Rate limited contact submissions" ON public.contact_messages;
DROP POLICY IF EXISTS "admin_only_contact_messages_select" ON public.contact_messages;
DROP POLICY IF EXISTS "deny_anonymous_contact_access" ON public.contact_messages;
DROP POLICY IF EXISTS "super_admin_contact_access" ON public.contact_messages;
DROP POLICY IF EXISTS "super_admin_contact_delete" ON public.contact_messages;
DROP POLICY IF EXISTS "super_admin_contact_update" ON public.contact_messages;

-- POLICY 1: Block ALL anonymous access (restrictive)
CREATE POLICY "block_anonymous_access"
ON public.contact_messages
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- POLICY 2: Allow rate-limited INSERT for anyone (public contact form)
-- This is necessary for the contact form to work without login
CREATE POLICY "rate_limited_public_insert"
ON public.contact_messages
FOR INSERT
TO anon, authenticated
WITH CHECK (
    public.check_rate_limit(
        COALESCE(inet_client_addr()::text, 'unknown'), 
        'contact_submission', 
        3,  -- max 3 submissions
        60  -- per 60 minutes
    )
);

-- POLICY 3: Only super_admins can SELECT contact messages
CREATE POLICY "super_admin_select_only"
ON public.contact_messages
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- POLICY 4: Only super_admins can UPDATE contact messages
CREATE POLICY "super_admin_update_only"
ON public.contact_messages
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- POLICY 5: Only super_admins can DELETE contact messages
CREATE POLICY "super_admin_delete_only"
ON public.contact_messages
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- =====================================================
-- Also fix related tables that might have similar issues
-- =====================================================

-- Fix newsletter_subscriptions - ensure anon can't read
DROP POLICY IF EXISTS "block_anonymous_newsletter_access" ON public.newsletter_subscriptions;
CREATE POLICY "block_anonymous_newsletter_access"
ON public.newsletter_subscriptions
AS RESTRICTIVE
FOR SELECT
TO anon
USING (false);

-- Fix support_tickets - ensure anon can't read
DROP POLICY IF EXISTS "deny_anonymous_support_tickets_access" ON public.support_tickets;
CREATE POLICY "block_anonymous_support_access"
ON public.support_tickets
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Fix error_reports - ensure anon can't read
DROP POLICY IF EXISTS "block_anonymous_error_reports" ON public.support_tickets_error_reports;
CREATE POLICY "block_anonymous_error_reports"
ON public.support_tickets_error_reports
AS RESTRICTIVE
FOR SELECT
TO anon
USING (false);