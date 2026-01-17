-- =====================================================
-- FIX 1: email_logs - Restrict to super_admin only + add masking
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view email logs" ON public.email_logs;
DROP POLICY IF EXISTS "Admins can update email logs" ON public.email_logs;
DROP POLICY IF EXISTS "Authenticated users can insert email logs" ON public.email_logs;

-- Block anonymous access completely
CREATE POLICY "block_anonymous_email_logs"
ON public.email_logs
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Only super_admins can SELECT (not regular admins)
CREATE POLICY "super_admin_select_email_logs"
ON public.email_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Only super_admins can UPDATE
CREATE POLICY "super_admin_update_email_logs"
ON public.email_logs
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- System/authenticated can INSERT (for sending emails)
CREATE POLICY "system_insert_email_logs"
ON public.email_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- =====================================================
-- FIX 2: audit_logs - Block anonymous, restrict to super_admin
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "super_admin_view_audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "authenticated_insert_audit_logs" ON public.audit_logs;

-- Block anonymous access
CREATE POLICY "block_anonymous_audit_logs"
ON public.audit_logs
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Only super_admins can SELECT
CREATE POLICY "super_admin_select_audit_logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Allow system/authenticated INSERT for logging
CREATE POLICY "system_insert_audit_logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- =====================================================
-- FIX 3: security_events - Restrict to super_admin only
-- =====================================================

DROP POLICY IF EXISTS "Admins can view security events" ON public.security_events;
DROP POLICY IF EXISTS "Admins can update security events" ON public.security_events;
DROP POLICY IF EXISTS "Validated security events insert" ON public.security_events;

-- Block anonymous
CREATE POLICY "block_anonymous_security_events"
ON public.security_events
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Only super_admins can SELECT
CREATE POLICY "super_admin_select_security_events"
ON public.security_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Only super_admins can UPDATE
CREATE POLICY "super_admin_update_security_events"
ON public.security_events
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- System INSERT allowed
CREATE POLICY "system_insert_security_events"
ON public.security_events
FOR INSERT
TO authenticated
WITH CHECK (true);

-- =====================================================
-- FIX 4: security_alerts - Restrict to super_admin only
-- =====================================================

DROP POLICY IF EXISTS "super_admin_view_security_alerts" ON public.security_alerts;
DROP POLICY IF EXISTS "super_admin_update_security_alerts" ON public.security_alerts;
DROP POLICY IF EXISTS "system_insert_security_alerts" ON public.security_alerts;

-- Block anonymous
CREATE POLICY "block_anonymous_security_alerts"
ON public.security_alerts
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Only super_admins can SELECT
CREATE POLICY "super_admin_select_security_alerts"
ON public.security_alerts
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Only super_admins can UPDATE
CREATE POLICY "super_admin_update_security_alerts"
ON public.security_alerts
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- System INSERT allowed
CREATE POLICY "system_insert_security_alerts"
ON public.security_alerts
FOR INSERT
TO authenticated
WITH CHECK (true);

-- =====================================================
-- FIX 5: Create secure masked view for email logs
-- =====================================================

CREATE OR REPLACE VIEW public.email_logs_masked
WITH (security_barrier = true, security_invoker = true)
AS
SELECT
    el.id,
    public.mask_email(el.recipient_email) AS recipient_email,
    LEFT(COALESCE(el.recipient_name, ''), 1) || '***' AS recipient_name,
    el.template_name,
    el.status,
    el.sent_at,
    el.created_at,
    el.order_id
FROM public.email_logs el
WHERE public.has_role(auth.uid(), 'super_admin');

GRANT SELECT ON public.email_logs_masked TO authenticated;
REVOKE ALL ON public.email_logs_masked FROM anon;
REVOKE ALL ON public.email_logs_masked FROM public;