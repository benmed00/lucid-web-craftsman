-- Critical Security Fixes: Database Functions and RLS Policies
-- Fix all database functions to have secure search_path settings

-- Update all existing functions to include SET search_path = 'public' for security
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name')
  ON CONFLICT (id) DO NOTHING;

  -- Initialize loyalty account with welcome bonus
  PERFORM public.init_loyalty_account(NEW.id);
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_loyalty_points(user_uuid uuid, points integer, transaction_type text, source_type text, source_id text DEFAULT NULL::text, description text DEFAULT 'Points earned'::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

CREATE OR REPLACE FUNCTION public.update_loyalty_tier(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

CREATE OR REPLACE FUNCTION public.log_admin_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log admin user changes
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      user_id, action, resource_type, resource_id, 
      new_values, ip_address, user_agent
    ) VALUES (
      auth.uid(), 'CREATE_ADMIN', 'admin_user', NEW.id::text,
      to_jsonb(NEW), inet_client_addr(), 
      current_setting('request.headers', true)::json->>'user-agent'
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (
      user_id, action, resource_type, resource_id,
      old_values, new_values, ip_address, user_agent
    ) VALUES (
      auth.uid(), 'UPDATE_ADMIN', 'admin_user', NEW.id::text,
      to_jsonb(OLD), to_jsonb(NEW), inet_client_addr(),
      current_setting('request.headers', true)::json->>'user-agent'
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_security_event(p_event_type text, p_severity text DEFAULT 'medium'::text, p_event_data jsonb DEFAULT '{}'::jsonb, p_user_id uuid DEFAULT NULL::uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Validate input parameters
  IF p_event_type IS NULL OR p_event_type = '' THEN
    RAISE EXCEPTION 'Event type cannot be null or empty';
  END IF;
  
  IF p_severity NOT IN ('low', 'medium', 'high', 'critical') THEN
    RAISE EXCEPTION 'Invalid severity level. Must be: low, medium, high, or critical';
  END IF;

  INSERT INTO public.security_events (
    event_type, severity, user_id, ip_address, user_agent, event_data
  ) VALUES (
    p_event_type, 
    p_severity, 
    COALESCE(p_user_id, auth.uid()),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent',
    COALESCE(p_event_data, '{}'::jsonb)
  );
END;
$$;