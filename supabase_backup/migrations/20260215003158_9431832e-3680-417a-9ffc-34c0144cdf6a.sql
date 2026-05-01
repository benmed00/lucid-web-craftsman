
-- Drop existing add_loyalty_points with old parameter names
DROP FUNCTION IF EXISTS public.add_loyalty_points(uuid, integer, text, text, text);

-- Create init_loyalty_account function
CREATE OR REPLACE FUNCTION public.init_loyalty_account(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.loyalty_points (user_id, points_balance, total_points_earned, total_points_spent, tier, tier_progress, next_tier_threshold)
  VALUES (p_user_id, 0, 0, 0, 'bronze', 0, 500)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- Create add_loyalty_points function
CREATE OR REPLACE FUNCTION public.add_loyalty_points(
  p_user_id uuid,
  p_points integer,
  p_source_type text,
  p_source_id text DEFAULT NULL,
  p_description text DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_balance integer;
  v_new_total_earned integer;
  v_new_total_spent integer;
  v_transaction_type text;
BEGIN
  IF p_points >= 0 THEN
    v_transaction_type := 'earn';
  ELSE
    v_transaction_type := 'spend';
  END IF;

  UPDATE public.loyalty_points
  SET 
    points_balance = points_balance + p_points,
    total_points_earned = CASE WHEN p_points > 0 THEN total_points_earned + p_points ELSE total_points_earned END,
    total_points_spent = CASE WHEN p_points < 0 THEN total_points_spent + ABS(p_points) ELSE total_points_spent END,
    updated_at = now()
  WHERE user_id = p_user_id
  RETURNING points_balance, total_points_earned, total_points_spent
  INTO v_new_balance, v_new_total_earned, v_new_total_spent;

  INSERT INTO public.loyalty_transactions (user_id, points_change, transaction_type, source_type, source_id, description)
  VALUES (p_user_id, p_points, v_transaction_type, p_source_type, p_source_id, p_description);

  UPDATE public.loyalty_points
  SET 
    tier = CASE 
      WHEN v_new_total_earned >= 5000 THEN 'platinum'
      WHEN v_new_total_earned >= 2000 THEN 'gold'
      WHEN v_new_total_earned >= 500 THEN 'silver'
      ELSE 'bronze'
    END,
    tier_progress = v_new_total_earned,
    next_tier_threshold = CASE 
      WHEN v_new_total_earned >= 5000 THEN 10000
      WHEN v_new_total_earned >= 2000 THEN 5000
      WHEN v_new_total_earned >= 500 THEN 2000
      ELSE 500
    END
  WHERE user_id = p_user_id;
END;
$$;
