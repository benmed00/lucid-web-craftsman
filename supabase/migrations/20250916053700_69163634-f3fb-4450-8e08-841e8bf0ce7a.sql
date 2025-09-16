-- Fix Function Search Path Security Issue
-- This addresses the security linter warning about mutable search paths

-- Update existing functions to have immutable search paths
CREATE OR REPLACE FUNCTION public.user_owns_newsletter_subscription(subscription_email text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE users.id = auth.uid() 
    AND users.email = subscription_email
  );
$$;

CREATE OR REPLACE FUNCTION public.detect_newsletter_scraping_enhanced()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  access_count INTEGER;
BEGIN
  -- Enhanced detection for potential newsletter manipulation
  IF TG_OP IN ('INSERT', 'UPDATE') AND auth.uid() IS NOT NULL THEN
    -- Check how many newsletter operations this user performed recently
    SELECT COUNT(*) INTO access_count
    FROM public.audit_logs
    WHERE user_id = auth.uid()
      AND action LIKE '%NEWSLETTER%'
      AND created_at > now() - interval '1 hour';
    
    -- Flag as suspicious if too many operations
    IF access_count > 10 THEN
      PERFORM public.log_security_event(
        'SUSPICIOUS_NEWSLETTER_ACTIVITY',
        'medium',
        jsonb_build_object(
          'user_id', auth.uid(),
          'operation_count', access_count,
          'time_window', '1 hour',
          'operation_type', TG_OP,
          'detection_reason', 'Excessive newsletter operations'
        ),
        auth.uid()
      );
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_newsletter_subscriptions_admin()
RETURNS TABLE (
  id uuid,
  email text,
  status text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  consent_given boolean,
  source text,
  tags text[],
  metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Check if user is admin
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Log admin access to newsletter data
  INSERT INTO public.audit_logs (
    user_id, action, resource_type, resource_id,
    new_values, ip_address, user_agent
  ) VALUES (
    auth.uid(),
    'ADMIN_NEWSLETTER_ACCESS',
    'newsletter_subscriptions',
    'bulk_access',
    jsonb_build_object(
      'access_time', now(),
      'access_type', 'admin_function'
    ),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );

  -- Return newsletter subscriptions data
  RETURN QUERY
  SELECT 
    ns.id,
    ns.email,
    ns.status,
    ns.created_at,
    ns.updated_at,
    ns.consent_given,
    ns.source,
    ns.tags,
    ns.metadata
  FROM public.newsletter_subscriptions ns;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_newsletter_subscription()
RETURNS TABLE (
  id uuid,
  email text,
  status text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  consent_given boolean,
  source text,
  tags text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_email text;
BEGIN
  -- Get the current user's email
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
  
  IF user_email IS NULL THEN
    RAISE EXCEPTION 'User not found or not authenticated';
  END IF;

  -- Log user access to their own newsletter data
  INSERT INTO public.audit_logs (
    user_id, action, resource_type, resource_id,
    new_values, ip_address, user_agent
  ) VALUES (
    auth.uid(),
    'USER_NEWSLETTER_ACCESS',
    'newsletter_subscriptions',
    'own_subscription',
    jsonb_build_object(
      'access_time', now(),
      'email_accessed', public.mask_email(user_email)
    ),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );

  -- Return user's own newsletter subscription
  RETURN QUERY
  SELECT 
    ns.id,
    ns.email,
    ns.status,
    ns.created_at,
    ns.updated_at,
    ns.consent_given,
    ns.source,
    ns.tags
  FROM public.newsletter_subscriptions ns
  WHERE ns.email = user_email;
END;
$$;