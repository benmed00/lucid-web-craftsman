-- Continue fixing remaining function search path security issues

-- Fix more functions to have immutable search paths
CREATE OR REPLACE FUNCTION public.add_admin_user(p_user_id uuid, p_email text, p_full_name text DEFAULT NULL::text, p_is_super_admin boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE 
    v_requesting_user_id UUID;
BEGIN
    -- Get the current user's ID
    v_requesting_user_id := auth.uid();

    -- Check if the requesting user is a super admin
    IF NOT EXISTS (
        SELECT 1 
        FROM public.admin_users 
        WHERE user_id = v_requesting_user_id AND role = 'super-admin'
    ) THEN
        RAISE EXCEPTION 'Only super admins can add new admin users';
    END IF;

    -- Insert the new admin user
    INSERT INTO public.admin_users (user_id, email, full_name, role)
    VALUES (p_user_id, p_email, p_full_name, CASE WHEN p_is_super_admin THEN 'super-admin' ELSE 'admin' END);
END;
$$;

CREATE OR REPLACE FUNCTION public.add_loyalty_points(user_uuid uuid, points integer, transaction_type text, source_type text, source_id text DEFAULT NULL::text, description text DEFAULT 'Points earned'::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Validate input parameters
  IF user_uuid IS NULL OR points IS NULL OR transaction_type IS NULL OR source_type IS NULL THEN
    RAISE EXCEPTION 'Invalid parameters: user_uuid, points, transaction_type, and source_type cannot be null';
  END IF;
  
  IF points < -10000 OR points > 10000 THEN
    RAISE EXCEPTION 'Points value out of acceptable range (-10000 to 10000)';
  END IF;

  -- Ensure user has loyalty account
  INSERT INTO public.loyalty_points (user_id, points_balance, total_points_earned, total_points_spent, tier)
  VALUES (user_uuid, 0, 0, 0, 'bronze')
  ON CONFLICT (user_id) DO NOTHING;

  -- Insert transaction record
  INSERT INTO public.loyalty_transactions (
    user_id, points_change, transaction_type, source_type, source_id, description
  ) VALUES (
    user_uuid, points, transaction_type, source_type, source_id, description
  );

  -- Update user's loyalty points
  UPDATE public.loyalty_points
  SET 
    points_balance = points_balance + points,
    total_points_earned = CASE 
      WHEN transaction_type = 'earned' OR transaction_type = 'bonus' 
      THEN total_points_earned + points
      ELSE total_points_earned
    END,
    total_points_spent = CASE 
      WHEN transaction_type = 'spent' 
      THEN total_points_spent + ABS(points)
      ELSE total_points_spent
    END,
    updated_at = now()
  WHERE user_id = user_uuid;

  -- Update tier if points were earned
  IF transaction_type IN ('earned', 'bonus') THEN
    PERFORM public.update_loyalty_tier(user_uuid);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.anonymize_sensitive_data(input_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    result jsonb := input_data;
    sensitive_fields text[] := ARRAY['email', 'phone', 'address_line1', 'address_line2', 'first_name', 'last_name', 'ip_address'];
    field text;
BEGIN
    -- Validate input
    IF input_data IS NULL THEN
        RETURN '{}'::jsonb;
    END IF;

    -- Anonymize sensitive fields
    FOREACH field IN ARRAY sensitive_fields
    LOOP
        IF result ? field THEN
            result := jsonb_set(result, ARRAY[field], to_jsonb('***REDACTED***'), false);
        END IF;
    END LOOP;
    
    RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_old_payment_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

CREATE OR REPLACE FUNCTION public.can_access_support_ticket(ticket_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    ticket_user_id uuid;
BEGIN
    -- Get the user_id of the ticket
    SELECT user_id INTO ticket_user_id
    FROM public.support_tickets
    WHERE id = ticket_id;
    
    -- Allow access if user owns the ticket or is an admin
    RETURN (
        ticket_user_id = auth.uid() OR 
        public.is_admin_user(auth.uid())
    );
END;
$$;