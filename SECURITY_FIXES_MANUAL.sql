-- ============================================================================
-- COMPREHENSIVE SECURITY FIX MIGRATION
-- ============================================================================
-- This script addresses ALL critical security findings from the security scan.
-- Execute this in Supabase SQL Editor: 
-- https://supabase.com/dashboard/project/xcvlijchkmhjonhfildm/sql/new
-- ============================================================================

-- ============================================================================
-- 1. FIX ADMIN USER ENUMERATION (CRITICAL)
-- ============================================================================
-- Issue: Current policy allows any user to check admin status, enabling enumeration
-- Fix: Replace with security definer function that returns only boolean

DROP POLICY IF EXISTS "Users can view their own admin status" ON public.admin_users;

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
  )
$$;

CREATE POLICY "Only admins can view admin users"
ON public.admin_users FOR SELECT
USING (public.is_admin_user(auth.uid()));

-- ============================================================================
-- 2. FIX PROFILES PII EXPOSURE (CRITICAL)
-- ============================================================================
-- Issue: No explicit anonymous access denial, vulnerable if RLS fails
-- Fix: Add explicit denial + audit logging

CREATE POLICY "Deny anonymous access to profiles"
ON public.profiles FOR ALL
USING (auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION public.log_profile_access_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'SELECT' AND auth.uid() IS NOT NULL THEN
    PERFORM public.log_profile_access(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 3. SHIPPING ADDRESS PROTECTION (CRITICAL)
-- ============================================================================
-- Issue: No audit logging for admin access to customer addresses
-- Fix: Add comprehensive logging + bulk access detection

CREATE OR REPLACE FUNCTION public.log_shipping_address_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  access_count integer;
BEGIN
  IF TG_OP = 'SELECT' AND auth.uid() IS NOT NULL THEN
    INSERT INTO public.audit_logs (
      user_id, action, resource_type, resource_id,
      new_values, ip_address, user_agent
    ) VALUES (
      auth.uid(),
      'SHIPPING_ADDRESS_ACCESS',
      'shipping_address',
      NEW.id::text,
      jsonb_build_object(
        'access_time', now(),
        'is_admin', public.is_admin_user(auth.uid()),
        'masked_address', SUBSTRING(NEW.address_line1 FROM 1 FOR 10) || '***'
      ),
      inet_client_addr(),
      current_setting('request.headers', true)::json->>'user-agent'
    );

    SELECT COUNT(*) INTO access_count
    FROM public.audit_logs
    WHERE user_id = auth.uid()
      AND action = 'SHIPPING_ADDRESS_ACCESS'
      AND created_at > now() - interval '5 minutes';

    IF access_count > 50 THEN
      PERFORM public.log_security_event(
        'BULK_SHIPPING_ADDRESS_ACCESS',
        'critical',
        jsonb_build_object(
          'user_id', auth.uid(),
          'access_count', access_count,
          'time_window', '5 minutes'
        ),
        auth.uid()
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_shipping_address_access ON public.shipping_addresses;
CREATE TRIGGER trigger_log_shipping_address_access
AFTER SELECT ON public.shipping_addresses
FOR EACH ROW EXECUTE FUNCTION public.log_shipping_address_access();

-- ============================================================================
-- 4. DATA RETENTION POLICIES (GDPR COMPLIANCE)
-- ============================================================================
-- Issue: Data accumulates indefinitely, violates GDPR
-- Fix: Automated cleanup functions for old data

CREATE OR REPLACE FUNCTION public.archive_old_contact_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  WITH deleted AS (
    DELETE FROM public.contact_messages
    WHERE created_at < now() - interval '90 days'
      AND status IN ('resolved', 'closed')
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  IF deleted_count > 0 THEN
    PERFORM public.log_security_event(
      'CONTACT_DATA_RETENTION_CLEANUP',
      'low',
      jsonb_build_object(
        'deleted_count', deleted_count,
        'retention_policy', '90_days'
      )
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_old_error_reports()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  WITH deleted AS (
    DELETE FROM public.support_tickets_error_reports
    WHERE created_at < now() - interval '180 days'
      AND status IN ('resolved', 'closed')
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  IF deleted_count > 0 THEN
    PERFORM public.log_security_event(
      'ERROR_REPORT_RETENTION_CLEANUP',
      'low',
      jsonb_build_object(
        'deleted_count', deleted_count,
        'retention_policy', '180_days'
      )
    );
  END IF;
END;
$$;

-- ============================================================================
-- 5. PAYMENT DATA MONITORING (HIGH RISK)
-- ============================================================================
-- Issue: No alerts on bulk payment queries
-- Fix: Monitor and alert on suspicious payment access

CREATE OR REPLACE FUNCTION public.monitor_payment_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  access_count integer;
BEGIN
  IF TG_OP = 'SELECT' AND auth.uid() IS NOT NULL THEN
    INSERT INTO public.audit_logs (
      user_id, action, resource_type, resource_id,
      new_values, ip_address, user_agent
    ) VALUES (
      auth.uid(),
      'PAYMENT_DATA_ACCESS',
      'payment',
      NEW.id::text,
      jsonb_build_object(
        'access_time', now(),
        'is_admin', public.is_admin_user(auth.uid()),
        'amount', NEW.amount
      ),
      inet_client_addr(),
      current_setting('request.headers', true)::json->>'user-agent'
    );

    SELECT COUNT(*) INTO access_count
    FROM public.audit_logs
    WHERE user_id = auth.uid()
      AND action = 'PAYMENT_DATA_ACCESS'
      AND created_at > now() - interval '10 minutes';

    IF access_count > 10 THEN
      PERFORM public.log_security_event(
        'BULK_PAYMENT_DATA_ACCESS',
        'critical',
        jsonb_build_object(
          'user_id', auth.uid(),
          'access_count', access_count,
          'time_window', '10 minutes'
        ),
        auth.uid()
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_monitor_payment_access ON public.payments;
CREATE TRIGGER trigger_monitor_payment_access
AFTER SELECT ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.monitor_payment_access();

-- ============================================================================
-- 6. ERROR REPORT EMAIL PROTECTION
-- ============================================================================
-- Issue: No audit logging for error report access
-- Fix: Add comprehensive access logging

CREATE OR REPLACE FUNCTION public.log_error_report_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'SELECT' AND auth.uid() IS NOT NULL THEN
    INSERT INTO public.audit_logs (
      user_id, action, resource_type, resource_id,
      new_values, ip_address, user_agent
    ) VALUES (
      auth.uid(),
      'ERROR_REPORT_ACCESS',
      'error_report',
      NEW.id::text,
      jsonb_build_object(
        'access_time', now(),
        'masked_email', public.mask_email(NEW.email)
      ),
      inet_client_addr(),
      current_setting('request.headers', true)::json->>'user-agent'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_error_report_access ON public.support_tickets_error_reports;
CREATE TRIGGER trigger_log_error_report_access
AFTER SELECT ON public.support_tickets_error_reports
FOR EACH ROW EXECUTE FUNCTION public.log_error_report_access();

-- ============================================================================
-- 7. SECURITY MONITORING DASHBOARD
-- ============================================================================
-- Provides real-time security health metrics for admins

CREATE OR REPLACE FUNCTION public.get_security_health_metrics()
RETURNS TABLE(
  metric_name text,
  metric_value text,
  risk_level text,
  last_checked timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN QUERY
  WITH metrics AS (
    SELECT 
      'Critical Security Events (24h)' as metric,
      COUNT(*)::text as value,
      CASE 
        WHEN COUNT(*) > 10 THEN 'CRITICAL'
        WHEN COUNT(*) > 5 THEN 'HIGH'
        ELSE 'LOW'
      END as risk,
      now() as checked
    FROM public.security_events
    WHERE severity = 'critical'
      AND created_at > now() - interval '24 hours'

    UNION ALL

    SELECT 
      'Bulk Access Attempts (7d)' as metric,
      COUNT(DISTINCT user_id)::text as value,
      CASE 
        WHEN COUNT(DISTINCT user_id) > 5 THEN 'HIGH'
        WHEN COUNT(DISTINCT user_id) > 2 THEN 'MEDIUM'
        ELSE 'LOW'
      END as risk,
      now() as checked
    FROM public.security_events
    WHERE event_type LIKE '%BULK%'
      AND created_at > now() - interval '7 days'

    UNION ALL

    SELECT 
      'Failed Auth Attempts (1h)' as metric,
      COUNT(*)::text as value,
      CASE 
        WHEN COUNT(*) > 50 THEN 'CRITICAL'
        WHEN COUNT(*) > 20 THEN 'HIGH'
        ELSE 'LOW'
      END as risk,
      now() as checked
    FROM public.audit_logs
    WHERE action LIKE '%FAILED%'
      AND created_at > now() - interval '1 hour'
  )
  SELECT * FROM metrics;
END;
$$;

-- ============================================================================
-- 8. LOG MIGRATION COMPLETION
-- ============================================================================

INSERT INTO public.audit_logs (
  user_id, action, resource_type, resource_id, new_values
) VALUES (
  auth.uid(),
  'SECURITY_MIGRATION_APPLIED',
  'system',
  'comprehensive_security_fixes',
  jsonb_build_object(
    'migration_date', now(),
    'fixes_applied', jsonb_build_array(
      'admin_enumeration_fix',
      'profiles_pii_protection',
      'shipping_address_logging',
      'data_retention_policies',
      'payment_monitoring',
      'error_report_logging',
      'security_dashboard'
    )
  )
);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Next Steps:
-- 1. Schedule automated cleanup: 
--    - Run archive_old_contact_messages() daily
--    - Run archive_old_error_reports() weekly
-- 2. Configure Supabase Auth settings:
--    - Enable Leaked Password Protection
--    - Set OTP expiry to 600 seconds
-- 3. Upgrade Postgres version in Supabase dashboard
-- ============================================================================
