-- Fix loyalty system issues

-- Add unique constraint on user_id for loyalty_points table
ALTER TABLE public.loyalty_points ADD CONSTRAINT loyalty_points_user_id_key UNIQUE (user_id);

-- Fix the init_loyalty_account function with proper constraint
CREATE OR REPLACE FUNCTION public.init_loyalty_account(user_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert initial loyalty points record with ON CONFLICT handling
  INSERT INTO public.loyalty_points (
    user_id, points_balance, total_points_earned, total_points_spent, tier
  ) VALUES (
    user_uuid, 100, 100, 0, 'bronze'
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Add signup bonus transaction only if not exists
  INSERT INTO public.loyalty_transactions (
    user_id, points_change, transaction_type, source_type, description
  ) VALUES (
    user_uuid, 100, 'bonus', 'signup_bonus', 'Bonus de bienvenue'
  )
  ON CONFLICT DO NOTHING;
END;
$$;

-- Fix the add_loyalty_points function
CREATE OR REPLACE FUNCTION public.add_loyalty_points(
  user_uuid UUID,
  points INTEGER,
  transaction_type TEXT,
  source_type TEXT,
  source_id TEXT DEFAULT NULL,
  description TEXT DEFAULT 'Points earned'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

-- Fix the update_loyalty_tier function
CREATE OR REPLACE FUNCTION public.update_loyalty_tier(user_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_points INTEGER;
  new_tier TEXT;
  new_progress INTEGER;
  new_threshold INTEGER;
BEGIN
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