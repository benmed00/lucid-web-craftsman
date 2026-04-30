-- Fix remaining functions and RLS policies properly
-- Update remaining database functions with secure search_path

CREATE OR REPLACE FUNCTION public.get_profile_completion_percentage(user_uuid uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  total_fields INTEGER := 8;
  completed_fields INTEGER := 0;
  profile_record RECORD;
BEGIN
  -- Validate input
  IF user_uuid IS NULL THEN
    RETURN 0;
  END IF;

  SELECT * INTO profile_record
  FROM public.profiles
  WHERE id = user_uuid;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Check each important field
  IF profile_record.full_name IS NOT NULL AND profile_record.full_name != '' THEN
    completed_fields := completed_fields + 1;
  END IF;
  
  IF profile_record.bio IS NOT NULL AND profile_record.bio != '' THEN
    completed_fields := completed_fields + 1;
  END IF;
  
  IF profile_record.avatar_url IS NOT NULL AND profile_record.avatar_url != '' THEN
    completed_fields := completed_fields + 1;
  END IF;
  
  IF profile_record.phone IS NOT NULL AND profile_record.phone != '' THEN
    completed_fields := completed_fields + 1;
  END IF;
  
  IF profile_record.location IS NOT NULL AND profile_record.location != '' THEN
    completed_fields := completed_fields + 1;
  END IF;
  
  IF profile_record.city IS NOT NULL AND profile_record.city != '' THEN
    completed_fields := completed_fields + 1;
  END IF;
  
  IF profile_record.postal_code IS NOT NULL AND profile_record.postal_code != '' THEN
    completed_fields := completed_fields + 1;
  END IF;
  
  IF profile_record.country IS NOT NULL AND profile_record.country != '' THEN
    completed_fields := completed_fields + 1;
  END IF;
  
  RETURN ROUND((completed_fields::DECIMAL / total_fields) * 100);
END;
$$;

CREATE OR REPLACE FUNCTION public.log_user_activity(p_user_id uuid, p_activity_type text, p_description text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Validate input parameters
  IF p_user_id IS NULL OR p_activity_type IS NULL THEN
    RAISE EXCEPTION 'User ID and activity type cannot be null';
  END IF;

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

CREATE OR REPLACE FUNCTION public.add_admin_user(p_user_id uuid, p_email text, p_full_name text DEFAULT NULL::text, p_is_super_admin boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE 
    v_requesting_user_id UUID;
BEGIN
    -- Validate input parameters
    IF p_user_id IS NULL OR p_email IS NULL THEN
        RAISE EXCEPTION 'User ID and email cannot be null';
    END IF;

    -- Get the current user's ID
    v_requesting_user_id := auth.uid();

    -- Check if the requesting user is a super admin
    IF NOT EXISTS (
        SELECT 1 
        FROM public.admin_users 
        WHERE user_id = v_requesting_user_id AND is_super_admin = true
    ) THEN
        RAISE EXCEPTION 'Only super admins can add new admin users';
    END IF;

    -- Insert the new admin user
    INSERT INTO public.admin_users (user_id, email, full_name, is_super_admin)
    VALUES (p_user_id, p_email, p_full_name, p_is_super_admin);
END;
$$;

CREATE OR REPLACE FUNCTION public.can_access_support_ticket(ticket_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    ticket_user_id uuid;
BEGIN
    -- Validate input
    IF ticket_id IS NULL THEN
        RETURN false;
    END IF;

    -- Get the user_id of the ticket
    SELECT user_id INTO ticket_user_id
    FROM public.support_tickets
    WHERE id = ticket_id;
    
    -- Allow access if user owns the ticket or is an admin
    RETURN (
        ticket_user_id = auth.uid() OR 
        is_admin_user(auth.uid())
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_old_payment_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- Archive payment records older than 7 years (regulatory requirement)
    -- This would typically move data to an archive table or secure storage
    -- For now, we'll just add a note - implement actual archiving based on requirements
    
    PERFORM public.log_security_event(
        'PAYMENT_DATA_RETENTION_CHECK',
        'low',
        jsonb_build_object(
            'check_date', now(),
            'note', 'Payment data retention check performed'
        )
    );
END;
$$;

-- Fix newsletter subscription RLS policies properly
-- First drop the conflicting policy
DROP POLICY IF EXISTS "Users can manage their newsletter subscription by email" ON public.newsletter_subscriptions;

-- Create separate policies for different operations
CREATE POLICY "Users can insert newsletter subscriptions"
ON public.newsletter_subscriptions
FOR INSERT
WITH CHECK (true); -- Allow anyone to subscribe

CREATE POLICY "Users can view their own newsletter subscription"
ON public.newsletter_subscriptions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE users.id = auth.uid() 
    AND users.email = newsletter_subscriptions.email
  )
);

CREATE POLICY "Users can update their own newsletter subscription"
ON public.newsletter_subscriptions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE users.id = auth.uid() 
    AND users.email = newsletter_subscriptions.email
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE users.id = auth.uid() 
    AND users.email = newsletter_subscriptions.email
  )
);

-- Keep admin policy for full access
-- (Admin policy already exists)