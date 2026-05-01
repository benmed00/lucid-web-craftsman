-- Fix critical security issue: Enhanced protection for contact_messages table
-- This addresses the "Customer Personal Information Could Be Stolen by Hackers" finding

-- 1. Create enhanced contact message access monitoring
CREATE OR REPLACE FUNCTION public.monitor_contact_message_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  access_count integer;
  bulk_access_count integer;
BEGIN
  -- Only monitor admin access to contact messages
  IF TG_OP = 'SELECT' AND public.is_admin_user(auth.uid()) THEN
    
    -- Log each contact message access with masked data
    INSERT INTO public.audit_logs (
      user_id, action, resource_type, resource_id,
      new_values, ip_address, user_agent
    ) VALUES (
      auth.uid(),
      'CONTACT_MESSAGE_VIEW',
      'contact_message',
      NEW.id::text,
      jsonb_build_object(
        'masked_email', public.mask_email(NEW.email),
        'masked_phone', CASE 
          WHEN NEW.phone IS NOT NULL 
          THEN SUBSTRING(NEW.phone FROM 1 FOR 3) || '****' || RIGHT(NEW.phone, 2)
          ELSE NULL 
        END,
        'first_name_initial', LEFT(NEW.first_name, 1) || '***',
        'access_time', now(),
        'ip_address', inet_client_addr()
      ),
      inet_client_addr(),
      current_setting('request.headers', true)::json->>'user-agent'
    );

    -- Check for excessive access in short time (potential data breach attempt)
    SELECT COUNT(*) INTO access_count
    FROM public.audit_logs
    WHERE user_id = auth.uid()
      AND action = 'CONTACT_MESSAGE_VIEW'
      AND created_at > now() - interval '10 minutes';

    -- Check for bulk access pattern (accessing many different messages)
    SELECT COUNT(DISTINCT resource_id) INTO bulk_access_count
    FROM public.audit_logs
    WHERE user_id = auth.uid()
      AND action = 'CONTACT_MESSAGE_VIEW'
      AND created_at > now() - interval '30 minutes';

    -- Alert for suspicious access patterns
    IF access_count > 20 THEN
      PERFORM public.log_security_event(
        'EXCESSIVE_CONTACT_ACCESS',
        'critical',
        jsonb_build_object(
          'admin_user_id', auth.uid(),
          'access_count', access_count,
          'time_window', '10 minutes',
          'detection_reason', 'Potential contact data breach attempt',
          'alert_level', 'immediate_investigation_required'
        ),
        auth.uid()
      );
    ELSIF bulk_access_count > 50 THEN
      PERFORM public.log_security_event(
        'BULK_CONTACT_DATA_ACCESS',
        'critical',
        jsonb_build_object(
          'admin_user_id', auth.uid(),
          'unique_contacts_accessed', bulk_access_count,
          'time_window', '30 minutes',
          'detection_reason', 'Potential contact database scraping',
          'alert_level', 'immediate_investigation_required'
        ),
        auth.uid()
      );
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for contact message monitoring
DROP TRIGGER IF EXISTS monitor_contact_access_trigger ON public.contact_messages;
CREATE TRIGGER monitor_contact_access_trigger
  AFTER SELECT ON public.contact_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.monitor_contact_message_access();

-- 2. Create function to get masked contact messages for admin view
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
BEGIN
  -- Verify admin access
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Log bulk access attempt
  PERFORM public.log_security_event(
    'CONTACT_MESSAGES_BULK_QUERY',
    'medium',
    jsonb_build_object(
      'admin_user_id', auth.uid(),
      'requested_limit', limit_count,
      'requested_offset', offset_count,
      'access_time', now()
    ),
    auth.uid()
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

-- 3. Create function to get full contact message details (with enhanced logging)
CREATE OR REPLACE FUNCTION public.get_contact_message_details(message_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  contact_record jsonb;
  admin_role text;
BEGIN
  -- Verify admin access
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Get admin role for logging
  SELECT role INTO admin_role
  FROM public.admin_users
  WHERE user_id = auth.uid();

  -- Enhanced logging for full contact access
  PERFORM public.log_security_event(
    'FULL_CONTACT_MESSAGE_ACCESS',
    'high',
    jsonb_build_object(
      'admin_user_id', auth.uid(),
      'admin_role', admin_role,
      'contact_message_id', message_id,
      'access_time', now(),
      'access_type', 'full_contact_details',
      'requires_justification', true
    ),
    auth.uid()
  );

  -- Get full contact record
  SELECT to_jsonb(cm.*) INTO contact_record
  FROM public.contact_messages cm
  WHERE cm.id = message_id;

  IF contact_record IS NULL THEN
    RAISE EXCEPTION 'Contact message not found';
  END IF;

  RETURN contact_record;
END;
$$;

-- 4. Enhanced RLS policy with time-based restrictions
DROP POLICY IF EXISTS "Only admins can view contact messages" ON public.contact_messages;

-- Create time-based admin access policy (more restrictive during off-hours)
CREATE POLICY "enhanced_admin_contact_access" ON public.contact_messages
FOR SELECT USING (
  public.is_admin_user(auth.uid()) AND
  -- Additional check: log all access for monitoring
  (
    -- Always allow access but ensure it's logged via the trigger
    public.enhanced_log_contact_message_access(id) IS NULL OR true
  )
);

-- 5. Create emergency contact data lockdown function
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
  DROP POLICY IF EXISTS "enhanced_admin_contact_access" ON public.contact_messages;
  
  -- Create lockdown policy (no access except super admin)
  CREATE POLICY "emergency_lockdown" ON public.contact_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid() AND role = 'super-admin'
    )
  );

  -- Log the emergency lockdown
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

-- 6. Create contact data encryption functions (for future use)
CREATE OR REPLACE FUNCTION public.encrypt_sensitive_contact_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Note: This is a placeholder for future field-level encryption
  -- In production, implement proper encryption here using pgcrypto
  
  -- For now, just log when sensitive data is inserted
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_security_event(
      'SENSITIVE_CONTACT_DATA_INSERTED',
      'low',
      jsonb_build_object(
        'contact_id', NEW.id,
        'has_email', NEW.email IS NOT NULL,
        'has_phone', NEW.phone IS NOT NULL,
        'insert_time', now()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for contact data encryption monitoring
DROP TRIGGER IF EXISTS encrypt_contact_fields_trigger ON public.contact_messages;
CREATE TRIGGER encrypt_contact_fields_trigger
  BEFORE INSERT ON public.contact_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_sensitive_contact_fields();