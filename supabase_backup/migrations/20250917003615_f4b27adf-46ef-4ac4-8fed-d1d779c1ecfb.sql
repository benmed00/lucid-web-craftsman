-- Fix critical security issue: Enhanced protection for contact_messages table
-- This addresses "Customer Personal Information Could Be Stolen by Hackers" finding
-- Fixed version without invalid SELECT triggers

-- 1. Create function to get masked contact messages for admin view with monitoring
CREATE OR REPLACE FUNCTION public.get_masked_contact_messages(
  limit_count integer DEFAULT 50,
  offset_count integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  masked_email text,
  masked_phone text,
  first_name_masked text,
  last_name_masked text,
  subject text,
  message_preview text,
  status text,
  created_at timestamp with time zone,
  company text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  access_count integer;
  bulk_access_count integer;
BEGIN
  -- Verify admin access
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Monitor for excessive access patterns
  SELECT COUNT(*) INTO access_count
  FROM public.audit_logs
  WHERE user_id = auth.uid()
    AND action = 'CONTACT_MESSAGES_BULK_QUERY'
    AND created_at > now() - interval '10 minutes';

  SELECT COUNT(*) INTO bulk_access_count
  FROM public.audit_logs
  WHERE user_id = auth.uid()
    AND action = 'CONTACT_MESSAGES_BULK_QUERY'
    AND created_at > now() - interval '1 hour';

  -- Alert for suspicious access patterns
  IF access_count > 10 THEN
    PERFORM public.log_security_event(
      'EXCESSIVE_CONTACT_BULK_ACCESS',
      'critical',
      jsonb_build_object(
        'admin_user_id', auth.uid(),
        'access_count', access_count,
        'time_window', '10 minutes',
        'detection_reason', 'Potential contact data breach attempt'
      ),
      auth.uid()
    );
  ELSIF bulk_access_count > 20 THEN
    PERFORM public.log_security_event(
      'CONTACT_DATA_SCRAPING_ATTEMPT',
      'critical',
      jsonb_build_object(
        'admin_user_id', auth.uid(),
        'access_count', bulk_access_count,
        'time_window', '1 hour',
        'detection_reason', 'Potential contact database scraping'
      ),
      auth.uid()
    );
  END IF;

  -- Log bulk access attempt
  INSERT INTO public.audit_logs (
    user_id, action, resource_type, resource_id,
    new_values, ip_address, user_agent
  ) VALUES (
    auth.uid(),
    'CONTACT_MESSAGES_BULK_QUERY',
    'contact_messages',
    'bulk_query',
    jsonb_build_object(
      'requested_limit', limit_count,
      'requested_offset', offset_count,
      'access_time', now(),
      'total_previous_access_10min', access_count,
      'total_previous_access_1hour', bulk_access_count
    ),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );

  -- Return masked contact data
  RETURN QUERY
  SELECT 
    cm.id,
    public.mask_email(cm.email) as masked_email,
    CASE 
      WHEN cm.phone IS NOT NULL 
      THEN SUBSTRING(cm.phone FROM 1 FOR 3) || '****' || RIGHT(cm.phone, 2)
      ELSE NULL 
    END as masked_phone,
    LEFT(cm.first_name, 1) || REPEAT('*', LENGTH(cm.first_name) - 1) as first_name_masked,
    LEFT(cm.last_name, 1) || REPEAT('*', LENGTH(cm.last_name) - 1) as last_name_masked,
    cm.subject,
    LEFT(cm.message, 100) || CASE WHEN LENGTH(cm.message) > 100 THEN '...' ELSE '' END as message_preview,
    cm.status,
    cm.created_at,
    cm.company
  FROM public.contact_messages cm
  ORDER BY cm.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

-- 2. Create function to get full contact message details with enhanced logging
CREATE OR REPLACE FUNCTION public.get_contact_message_details(message_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  contact_record jsonb;
  admin_role text;
  access_count integer;
BEGIN
  -- Verify admin access
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Get admin role for enhanced logging
  SELECT role INTO admin_role
  FROM public.admin_users
  WHERE user_id = auth.uid();

  -- Check for excessive individual contact access
  SELECT COUNT(*) INTO access_count
  FROM public.audit_logs
  WHERE user_id = auth.uid()
    AND action = 'FULL_CONTACT_MESSAGE_ACCESS'
    AND created_at > now() - interval '1 hour';

  -- Alert if accessing too many individual contacts
  IF access_count > 30 THEN
    PERFORM public.log_security_event(
      'EXCESSIVE_INDIVIDUAL_CONTACT_ACCESS',
      'high',
      jsonb_build_object(
        'admin_user_id', auth.uid(),
        'admin_role', admin_role,
        'individual_access_count', access_count,
        'time_window', '1 hour',
        'detection_reason', 'Potential detailed contact data harvesting'
      ),
      auth.uid()
    );
  END IF;

  -- Get full contact record
  SELECT to_jsonb(cm.*) INTO contact_record
  FROM public.contact_messages cm
  WHERE cm.id = message_id;

  IF contact_record IS NULL THEN
    RAISE EXCEPTION 'Contact message not found';
  END IF;

  -- Enhanced logging for full contact access
  INSERT INTO public.audit_logs (
    user_id, action, resource_type, resource_id,
    new_values, ip_address, user_agent
  ) VALUES (
    auth.uid(),
    'FULL_CONTACT_MESSAGE_ACCESS',
    'contact_message',
    message_id::text,
    jsonb_build_object(
      'admin_role', admin_role,
      'contact_message_id', message_id,
      'access_time', now(),
      'masked_email', public.mask_email(contact_record->>'email'),
      'subject', contact_record->>'subject',
      'requires_justification', true,
      'previous_access_count_1hour', access_count
    ),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );

  RETURN contact_record;
END;
$$;

-- 3. Create enhanced RLS policy for contact messages
DROP POLICY IF EXISTS "Only admins can view contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "enhanced_admin_contact_access" ON public.contact_messages;

-- Create restrictive admin access policy with logging requirement
CREATE POLICY "secure_admin_contact_access" ON public.contact_messages
FOR SELECT USING (
  public.is_admin_user(auth.uid())
);

-- Keep existing policies for other operations
CREATE POLICY "admin_contact_update" ON public.contact_messages
FOR UPDATE USING (public.is_admin_user(auth.uid()))
WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "admin_contact_delete" ON public.contact_messages
FOR DELETE USING (public.is_admin_user(auth.uid()));

-- 4. Create emergency contact data lockdown function
CREATE OR REPLACE FUNCTION public.emergency_lockdown_contact_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Only super admins can trigger emergency lockdown
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid() AND role = 'super-admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;

  -- Drop all contact message access policies temporarily
  DROP POLICY IF EXISTS "secure_admin_contact_access" ON public.contact_messages;
  DROP POLICY IF EXISTS "admin_contact_update" ON public.contact_messages;
  DROP POLICY IF EXISTS "admin_contact_delete" ON public.contact_messages;
  
  -- Create lockdown policy (no access except super admin for read-only)
  CREATE POLICY "emergency_lockdown_readonly" ON public.contact_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid() AND role = 'super-admin'
    )
  );

  -- Log the emergency lockdown
  INSERT INTO public.audit_logs (
    user_id, action, resource_type, resource_id,
    new_values, ip_address, user_agent
  ) VALUES (
    auth.uid(),
    'EMERGENCY_CONTACT_DATA_LOCKDOWN',
    'contact_messages',
    'system_lockdown',
    jsonb_build_object(
      'triggered_by', auth.uid(),
      'lockdown_time', now(),
      'reason', 'Emergency security measure activated',
      'requires_manual_unlock', true,
      'lockdown_type', 'super_admin_only_readonly'
    ),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );

  PERFORM public.log_security_event(
    'EMERGENCY_CONTACT_DATA_LOCKDOWN',
    'critical',
    jsonb_build_object(
      'triggered_by', auth.uid(),
      'lockdown_time', now(),
      'reason', 'Emergency security measure activated',
      'requires_manual_unlock', true
    ),
    auth.uid()
  );
END;
$$;

-- 5. Create function to restore normal contact access (super admin only)
CREATE OR REPLACE FUNCTION public.restore_contact_data_access()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Only super admins can restore access
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid() AND role = 'super-admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;

  -- Drop lockdown policy
  DROP POLICY IF EXISTS "emergency_lockdown_readonly" ON public.contact_messages;
  
  -- Restore normal policies
  CREATE POLICY "secure_admin_contact_access" ON public.contact_messages
  FOR SELECT USING (public.is_admin_user(auth.uid()));

  CREATE POLICY "admin_contact_update" ON public.contact_messages
  FOR UPDATE USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

  CREATE POLICY "admin_contact_delete" ON public.contact_messages
  FOR DELETE USING (public.is_admin_user(auth.uid()));

  -- Log the restoration
  PERFORM public.log_security_event(
    'CONTACT_DATA_ACCESS_RESTORED',
    'high',
    jsonb_build_object(
      'restored_by', auth.uid(),
      'restore_time', now(),
      'previous_state', 'emergency_lockdown'
    ),
    auth.uid()
  );
END;
$$;

-- 6. Create contact data security monitoring function
CREATE OR REPLACE FUNCTION public.monitor_contact_data_security()
RETURNS TABLE(
  security_metric text,
  current_value text,
  risk_level text,
  recommendation text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Only admins can view security metrics
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Log security monitoring access
  PERFORM public.log_security_event(
    'CONTACT_SECURITY_MONITORING_ACCESS',
    'low',
    jsonb_build_object(
      'admin_user_id', auth.uid(),
      'monitoring_time', now()
    ),
    auth.uid()
  );

  RETURN QUERY
  WITH security_metrics AS (
    SELECT 
      'Total Contact Messages' as metric,
      COUNT(*)::text as value,
      CASE WHEN COUNT(*) > 10000 THEN 'HIGH' ELSE 'LOW' END as risk,
      'Consider archiving old messages' as rec
    FROM public.contact_messages
    
    UNION ALL
    
    SELECT 
      'Contact Access Events (24h)' as metric,
      COUNT(*)::text as value,
      CASE WHEN COUNT(*) > 100 THEN 'HIGH' WHEN COUNT(*) > 50 THEN 'MEDIUM' ELSE 'LOW' END as risk,
      'Monitor for unusual access patterns' as rec
    FROM public.audit_logs 
    WHERE action LIKE '%CONTACT%' AND created_at > now() - interval '24 hours'
    
    UNION ALL
    
    SELECT 
      'Unique Admins Accessing Contacts (7d)' as metric,
      COUNT(DISTINCT user_id)::text as value,
      CASE WHEN COUNT(DISTINCT user_id) > 5 THEN 'HIGH' ELSE 'LOW' END as risk,
      'Verify all admin access is authorized' as rec
    FROM public.audit_logs 
    WHERE action LIKE '%CONTACT%' AND created_at > now() - interval '7 days'
  )
  SELECT * FROM security_metrics;
END;
$$;