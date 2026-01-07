-- ===========================================
-- FIX OVERLY PERMISSIVE RLS POLICIES
-- ===========================================

-- 1. email_logs: System insert - restrict to authenticated users
DROP POLICY IF EXISTS "System can insert email logs" ON public.email_logs;
CREATE POLICY "Authenticated users can insert email logs"
ON public.email_logs
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
);

-- 2. newsletter_subscriptions: Insert - add email validation
DROP POLICY IF EXISTS "newsletter_insert_policy" ON public.newsletter_subscriptions;
CREATE POLICY "newsletter_insert_policy"
ON public.newsletter_subscriptions
FOR INSERT
WITH CHECK (
  email IS NOT NULL
  AND email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  AND check_rate_limit(COALESCE(inet_client_addr()::text, 'unknown'), 'newsletter_subscribe', 5, 60)
);

-- 3. order_items: System insert - restrict to authenticated users with valid order
DROP POLICY IF EXISTS "System can insert order items" ON public.order_items;
CREATE POLICY "Users can insert their own order items"
ON public.order_items
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.orders 
    WHERE id = order_id 
    AND user_id = auth.uid()
  )
);

-- 4. payments: Update - restrict to order owners or super admins
DROP POLICY IF EXISTS "payments_update" ON public.payments;
CREATE POLICY "payments_update"
ON public.payments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.orders o 
    WHERE o.id = order_id 
    AND o.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  amount > 0 
  AND currency IS NOT NULL
  AND status IS NOT NULL
);

-- 5. product_analytics: Insert - validate and rate limit
DROP POLICY IF EXISTS "System can insert analytics" ON public.product_analytics;
CREATE POLICY "Anyone can insert analytics events"
ON public.product_analytics
FOR INSERT
WITH CHECK (
  event_type IS NOT NULL
  AND event_type IN ('view', 'click', 'add_to_cart', 'purchase', 'wishlist_add', 'share')
  AND check_rate_limit(
    COALESCE(session_id, inet_client_addr()::text, 'unknown'), 
    'analytics_event', 
    100,
    60
  )
);

-- 6. rate_limits: Fix overly permissive ALL policy
DROP POLICY IF EXISTS "rate_limits_policy" ON public.rate_limits;

CREATE POLICY "rate_limits_insert"
ON public.rate_limits
FOR INSERT
WITH CHECK (
  identifier IS NOT NULL
  AND action_type IS NOT NULL
  AND attempts >= 1
);

CREATE POLICY "rate_limits_update"
ON public.rate_limits
FOR UPDATE
USING (
  identifier IS NOT NULL
  AND action_type IS NOT NULL
)
WITH CHECK (
  attempts >= 1
);

CREATE POLICY "rate_limits_select"
ON public.rate_limits
FOR SELECT
USING (true);

CREATE POLICY "rate_limits_delete"
ON public.rate_limits
FOR DELETE
USING (
  window_start < NOW() - INTERVAL '24 hours'
  OR is_admin_user(auth.uid())
);

-- 7. scheduled_emails: Insert - restrict to admins
DROP POLICY IF EXISTS "scheduled_emails_insert" ON public.scheduled_emails;
CREATE POLICY "scheduled_emails_insert"
ON public.scheduled_emails
FOR INSERT
TO authenticated
WITH CHECK (
  is_admin_user(auth.uid())
  AND recipient_email IS NOT NULL
  AND template_name IS NOT NULL
  AND scheduled_for IS NOT NULL
);

-- 8. scheduled_emails: Update - restrict to admins
DROP POLICY IF EXISTS "scheduled_emails_update" ON public.scheduled_emails;
CREATE POLICY "scheduled_emails_update"
ON public.scheduled_emails
FOR UPDATE
TO authenticated
USING (
  is_admin_user(auth.uid())
)
WITH CHECK (
  recipient_email IS NOT NULL
  AND template_name IS NOT NULL
);

-- 9. security_alerts: Insert - validate required fields
DROP POLICY IF EXISTS "system_insert_security_alerts" ON public.security_alerts;
CREATE POLICY "system_insert_security_alerts"
ON public.security_alerts
FOR INSERT
WITH CHECK (
  alert_type IS NOT NULL
  AND title IS NOT NULL
  AND severity IN ('low', 'medium', 'high', 'critical')
);

-- 10. security_events: Insert - validate structure
DROP POLICY IF EXISTS "Authenticated users and system can insert security events" ON public.security_events;
CREATE POLICY "Validated security events insert"
ON public.security_events
FOR INSERT
WITH CHECK (
  event_type IS NOT NULL
  AND severity IN ('low', 'medium', 'high', 'critical')
  AND event_data IS NOT NULL
);

-- 11. support_tickets_error_reports: Insert - validate (using correct column name)
DROP POLICY IF EXISTS "error_reports_insert" ON public.support_tickets_error_reports;
CREATE POLICY "error_reports_insert"
ON public.support_tickets_error_reports
FOR INSERT
WITH CHECK (
  description IS NOT NULL
  AND check_rate_limit(
    COALESCE(auth.uid()::text, inet_client_addr()::text, 'unknown'),
    'error_report',
    10,
    60
  )
);