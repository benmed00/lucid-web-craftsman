-- Enhance RLS policies for critical data protection
-- Fix 1: Strengthen profiles table policies - ensure complete isolation
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Create more restrictive profile policies with explicit conditions
CREATE POLICY "strict_profile_select" ON public.profiles
FOR SELECT USING (
  auth.uid() IS NOT NULL AND 
  auth.uid() = id
);

CREATE POLICY "strict_profile_update" ON public.profiles
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND 
  auth.uid() = id
) WITH CHECK (
  auth.uid() IS NOT NULL AND 
  auth.uid() = id
);

CREATE POLICY "strict_profile_insert" ON public.profiles
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND 
  auth.uid() = id
);

-- Deny all profile deletion for security
CREATE POLICY "deny_profile_delete" ON public.profiles
FOR DELETE USING (false);

-- Fix 2: Strengthen shipping addresses policies
DROP POLICY IF EXISTS "Users can manage their own shipping addresses" ON public.shipping_addresses;

CREATE POLICY "strict_shipping_select" ON public.shipping_addresses
FOR SELECT USING (
  auth.uid() IS NOT NULL AND 
  auth.uid() = user_id
);

CREATE POLICY "strict_shipping_insert" ON public.shipping_addresses
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND 
  auth.uid() = user_id
);

CREATE POLICY "strict_shipping_update" ON public.shipping_addresses
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND 
  auth.uid() = user_id
) WITH CHECK (
  auth.uid() IS NOT NULL AND 
  auth.uid() = user_id
);

CREATE POLICY "strict_shipping_delete" ON public.shipping_addresses
FOR DELETE USING (
  auth.uid() IS NOT NULL AND 
  auth.uid() = user_id
);

-- Admins can view shipping addresses (keep existing admin policy)
CREATE POLICY "admin_shipping_select" ON public.shipping_addresses
FOR SELECT USING (is_admin_user(auth.uid()));

-- Fix 3: Enhanced monitoring - Create profile access logging function
CREATE OR REPLACE FUNCTION public.log_profile_access(accessed_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  access_count integer;
BEGIN
  -- Log profile access for monitoring
  INSERT INTO public.audit_logs (
    user_id, action, resource_type, resource_id,
    new_values, ip_address, user_agent
  ) VALUES (
    auth.uid(),
    'PROFILE_ACCESS',
    'profile',
    accessed_profile_id::text,
    jsonb_build_object(
      'access_time', now(),
      'access_type', 'profile_view'
    ),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );

  -- Security monitoring: Check for excessive profile access
  SELECT COUNT(*) INTO access_count
  FROM public.audit_logs
  WHERE user_id = auth.uid()
    AND action = 'PROFILE_ACCESS'
    AND created_at > now() - interval '1 hour';

  -- Flag suspicious activity
  IF access_count > 20 THEN
    PERFORM public.log_security_event(
      'SUSPICIOUS_PROFILE_ACCESS',
      'high',
      jsonb_build_object(
        'user_id', auth.uid(),
        'access_count', access_count,
        'time_window', '1 hour',
        'detection_reason', 'Excessive profile access attempts'
      ),
      auth.uid()
    );
  END IF;
END;
$$;

-- Fix 4: Enhanced newsletter subscription protection
DROP POLICY IF EXISTS "Users can view own newsletter subscription by email" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "Users can update own newsletter subscription" ON public.newsletter_subscriptions;

-- More restrictive newsletter policies
CREATE POLICY "strict_newsletter_user_select" ON public.newsletter_subscriptions
FOR SELECT USING (
  auth.uid() IS NOT NULL AND
  user_owns_newsletter_subscription(email)
);

CREATE POLICY "strict_newsletter_user_update" ON public.newsletter_subscriptions
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND
  user_owns_newsletter_subscription(email)
) WITH CHECK (
  auth.uid() IS NOT NULL AND
  user_owns_newsletter_subscription(email)
);

-- Fix 5: Add contact message access logging
CREATE OR REPLACE FUNCTION public.enhanced_log_contact_message_access(message_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  contact_email text;
  access_count integer;
BEGIN
  -- Verify admin access
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  -- Get the email from the contact message
  SELECT email INTO contact_email 
  FROM public.contact_messages 
  WHERE id = message_id;
  
  -- Log the access with masking
  INSERT INTO public.audit_logs (
    user_id, action, resource_type, resource_id,
    new_values, ip_address, user_agent
  ) VALUES (
    auth.uid(),
    'CONTACT_MESSAGE_ACCESS',
    'contact_message',
    message_id::text,
    jsonb_build_object(
      'email_accessed', public.mask_email(contact_email),
      'access_time', now()
    ),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );

  -- Monitor for excessive contact data access
  SELECT COUNT(*) INTO access_count
  FROM public.audit_logs
  WHERE user_id = auth.uid()
    AND action = 'CONTACT_MESSAGE_ACCESS'
    AND created_at > now() - interval '1 hour';

  IF access_count > 50 THEN
    PERFORM public.log_security_event(
      'EXCESSIVE_CONTACT_ACCESS',
      'critical',
      jsonb_build_object(
        'user_id', auth.uid(),
        'access_count', access_count,
        'time_window', '1 hour',
        'detection_reason', 'Potential contact data scraping'
      ),
      auth.uid()
    );
  END IF;
END;
$$;

-- Fix 6: Add payment access monitoring trigger
CREATE OR REPLACE FUNCTION public.monitor_payment_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  access_count integer;
BEGIN
  -- Only monitor SELECT operations
  IF TG_OP = 'SELECT' THEN
    -- Log payment access
    INSERT INTO public.audit_logs (
      user_id, action, resource_type, resource_id,
      new_values, ip_address, user_agent
    ) VALUES (
      auth.uid(),
      'PAYMENT_DATA_ACCESS',
      'payment',
      NEW.id::text,
      jsonb_build_object(
        'amount', NEW.amount,
        'masked_payment_id', 'pi_****' || right(NEW.stripe_payment_intent_id, 4),
        'access_time', now()
      ),
      inet_client_addr(),
      current_setting('request.headers', true)::json->>'user-agent'
    );

    -- Check for excessive access
    SELECT COUNT(*) INTO access_count
    FROM public.audit_logs
    WHERE user_id = auth.uid()
      AND action = 'PAYMENT_DATA_ACCESS'
      AND created_at > now() - interval '10 minutes';

    IF access_count > 10 THEN
      PERFORM public.log_security_event(
        'SUSPICIOUS_PAYMENT_ACCESS',
        'critical',
        jsonb_build_object(
          'user_id', auth.uid(),
          'access_count', access_count,
          'time_window', '10 minutes',
          'detection_reason', 'Potential payment data breach attempt'
        ),
        auth.uid()
      );
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for payment access monitoring
DROP TRIGGER IF EXISTS monitor_payment_access_trigger ON public.payments;
CREATE TRIGGER monitor_payment_access_trigger
  AFTER SELECT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.monitor_payment_access();