
-- Drop old loyalty functions with original parameter names
DROP FUNCTION IF EXISTS public.init_loyalty_account(uuid);
DROP FUNCTION IF EXISTS public.update_loyalty_tier(uuid);
DROP FUNCTION IF EXISTS public.add_loyalty_points(uuid, integer, text, text, text);

-- Secure init_loyalty_account with auth validation
CREATE OR REPLACE FUNCTION public.init_loyalty_account(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF auth.uid() != p_user_id AND NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  INSERT INTO public.loyalty_points (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- Secure update_loyalty_tier with auth validation
CREATE OR REPLACE FUNCTION public.update_loyalty_tier(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_total_points integer;
  v_new_tier text;
  v_next_threshold integer;
  v_progress numeric;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF auth.uid() != p_user_id AND NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT total_points_earned INTO v_total_points
  FROM public.loyalty_points WHERE user_id = p_user_id;

  IF v_total_points IS NULL THEN RETURN; END IF;

  IF v_total_points >= 5000 THEN
    v_new_tier := 'gold'; v_next_threshold := 10000;
  ELSIF v_total_points >= 2000 THEN
    v_new_tier := 'silver'; v_next_threshold := 5000;
  ELSIF v_total_points >= 500 THEN
    v_new_tier := 'bronze'; v_next_threshold := 2000;
  ELSE
    v_new_tier := 'standard'; v_next_threshold := 500;
  END IF;

  v_progress := LEAST((v_total_points::numeric / v_next_threshold::numeric) * 100, 100);

  UPDATE public.loyalty_points
  SET tier = v_new_tier, next_tier_threshold = v_next_threshold,
      tier_progress = v_progress, updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

-- Secure add_loyalty_points with auth validation
CREATE OR REPLACE FUNCTION public.add_loyalty_points(
  p_user_id uuid, p_points integer, p_source_type text,
  p_description text, p_source_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF auth.uid() != p_user_id AND NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.loyalty_points
  SET points_balance = points_balance + p_points,
      total_points_earned = CASE WHEN p_points > 0 THEN total_points_earned + p_points ELSE total_points_earned END,
      total_points_spent = CASE WHEN p_points < 0 THEN total_points_spent + ABS(p_points) ELSE total_points_spent END,
      updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.loyalty_transactions (
    user_id, points_change, transaction_type, source_type, source_id, description
  ) VALUES (
    p_user_id, p_points,
    CASE WHEN p_points > 0 THEN 'earn' ELSE 'spend' END,
    p_source_type, p_source_id, p_description
  );
END;
$$;
