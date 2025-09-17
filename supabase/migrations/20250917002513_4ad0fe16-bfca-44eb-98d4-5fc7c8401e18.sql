-- Final functions: complete all remaining function search path security fixes

CREATE OR REPLACE FUNCTION public.log_contact_message_access(message_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  contact_email text;
BEGIN
  -- Get the email from the contact message (only admins can call this)
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  SELECT email INTO contact_email 
  FROM public.contact_messages 
  WHERE id = message_id;
  
  -- Log the access
  INSERT INTO public.audit_logs (
    user_id, action, resource_type, resource_id,
    new_values, ip_address, user_agent
  ) VALUES (
    auth.uid(),
    'CONTACT_MESSAGE_ACCESS',
    'contact_message',
    message_id::text,
    jsonb_build_object('email_accessed', public.mask_email(contact_email)),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.log_newsletter_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Log newsletter subscription access for security monitoring
  IF TG_OP = 'SELECT' AND auth.uid() IS NOT NULL THEN
    INSERT INTO public.audit_logs (
      user_id, action, resource_type, resource_id,
      new_values, ip_address, user_agent
    ) VALUES (
      auth.uid(),
      'NEWSLETTER_ACCESS',
      'newsletter_subscription',
      NEW.id::text,
      jsonb_build_object('email_accessed', NEW.email),
      inet_client_addr(),
      current_setting('request.headers', true)::json->>'user-agent'
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.log_user_activity(p_user_id uuid, p_activity_type text, p_description text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Insert into audit_logs for activity tracking
  INSERT INTO public.audit_logs (
    user_id, action, resource_type, resource_id, new_values, ip_address, user_agent
  ) VALUES (
    p_user_id, 
    p_activity_type, 
    'user_activity', 
    p_user_id::TEXT,
    jsonb_build_object('description', p_description, 'metadata', p_metadata),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only trigger for status changes on significant statuses
  IF NEW.status IS DISTINCT FROM OLD.status 
     AND NEW.status IN ('paid', 'processing', 'shipped', 'delivered', 'cancelled') 
     AND OLD.status != NEW.status THEN
    
    -- Call the edge function to send notification
    PERFORM
      net.http_post(
        url := 'https://xcvlijchkmhjonhfildm.supabase.co/functions/v1/send-order-notification-improved',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
        ),
        body := jsonb_build_object(
          'order_id', NEW.id::text,
          'old_status', OLD.status,
          'new_status', NEW.status
        )
      );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_error_report_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
    NEW.resolved_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_loyalty_tier(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  total_points INTEGER;
  new_tier TEXT;
  new_progress INTEGER;
  new_threshold INTEGER;
BEGIN
  -- Validate input
  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'User UUID cannot be null';
  END IF;

  -- Get current total points earned
  SELECT total_points_earned INTO total_points
  FROM public.loyalty_points
  WHERE user_id = user_uuid;

  -- If no record found, exit
  IF total_points IS NULL THEN
    RETURN;
  END IF;

  -- Determine tier based on total points earned
  IF total_points >= 5000 THEN
    new_tier := 'platinum';
    new_progress := total_points - 5000;
    new_threshold := 0; -- Max tier
  ELSIF total_points >= 2000 THEN
    new_tier := 'gold';
    new_progress := total_points - 2000;
    new_threshold := 5000;
  ELSIF total_points >= 500 THEN
    new_tier := 'silver';
    new_progress := total_points - 500;
    new_threshold := 2000;
  ELSE
    new_tier := 'bronze';
    new_progress := total_points;
    new_threshold := 500;
  END IF;

  -- Update the user's tier
  UPDATE public.loyalty_points
  SET 
    tier = new_tier,
    tier_progress = new_progress,
    next_tier_threshold = new_threshold,
    updated_at = now()
  WHERE user_id = user_uuid;
END;
$$;