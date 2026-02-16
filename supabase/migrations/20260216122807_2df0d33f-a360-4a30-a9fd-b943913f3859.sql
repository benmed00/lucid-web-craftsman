-- Create the missing init_loyalty_account RPC
CREATE OR REPLACE FUNCTION public.init_loyalty_account(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.loyalty_points (user_id, points_balance, total_points_earned, total_points_spent, tier, tier_progress, next_tier_threshold)
  VALUES (p_user_id, 0, 0, 0, 'bronze', 0, 500)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- Restrict execution to authenticated users only (not anon)
REVOKE EXECUTE ON FUNCTION public.init_loyalty_account(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.init_loyalty_account(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.init_loyalty_account(uuid) TO authenticated;