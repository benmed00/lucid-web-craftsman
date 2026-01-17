-- Fix "RLS Policy Always True" warnings for INSERT policies
-- These need valid checks instead of just (true)

-- Fix email_logs INSERT - only allow system/edge functions
DROP POLICY IF EXISTS "system_insert_email_logs" ON public.email_logs;
CREATE POLICY "authenticated_insert_email_logs"
ON public.email_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Fix audit_logs INSERT - only authenticated with valid user
DROP POLICY IF EXISTS "system_insert_audit_logs" ON public.audit_logs;
CREATE POLICY "authenticated_insert_audit_logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Fix security_events INSERT
DROP POLICY IF EXISTS "system_insert_security_events" ON public.security_events;
CREATE POLICY "authenticated_insert_security_events"
ON public.security_events
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Fix security_alerts INSERT
DROP POLICY IF EXISTS "system_insert_security_alerts" ON public.security_alerts;
CREATE POLICY "authenticated_insert_security_alerts"
ON public.security_alerts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);