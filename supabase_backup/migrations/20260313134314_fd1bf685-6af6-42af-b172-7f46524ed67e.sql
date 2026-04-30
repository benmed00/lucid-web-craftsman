
-- 1. Fix app_settings: restrict SELECT to admins only
DROP POLICY IF EXISTS "app_settings_select_authenticated" ON public.app_settings;
CREATE POLICY "app_settings_select_admin_only" ON public.app_settings
  FOR SELECT TO authenticated
  USING (public.is_user_admin((SELECT auth.uid())));

-- 2. Fix checkout_sessions: prevent user_id injection on INSERT
DROP POLICY IF EXISTS "checkout_sessions_insert" ON public.checkout_sessions;
CREATE POLICY "checkout_sessions_insert" ON public.checkout_sessions
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    (user_id IS NULL OR user_id = auth.uid())
    AND (
      auth.uid() IS NOT NULL
      OR public.get_request_guest_id() IS NOT NULL
    )
  );

-- 3. Fix discount_coupons: restrict anonymous full listing
CREATE OR REPLACE FUNCTION public.validate_coupon_code(p_code text)
RETURNS SETOF public.discount_coupons
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT * FROM public.discount_coupons
  WHERE UPPER(code) = UPPER(p_code)
    AND is_active = true
    AND (valid_from IS NULL OR valid_from <= now())
    AND (valid_until IS NULL OR valid_until >= now())
    AND (usage_limit IS NULL OR usage_count < usage_limit)
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.validate_coupon_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_coupon_code(text) TO anon, authenticated;

DROP POLICY IF EXISTS "discount_coupons_select_active_only" ON public.discount_coupons;
CREATE POLICY "discount_coupons_select_admin_only" ON public.discount_coupons
  FOR SELECT TO anon, authenticated
  USING (public.is_user_admin((SELECT auth.uid())));
