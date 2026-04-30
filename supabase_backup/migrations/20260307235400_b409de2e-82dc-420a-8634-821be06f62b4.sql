-- Fix 1: Restrict discount_coupons SELECT — hide coupon codes/values from public
DROP POLICY IF EXISTS "discount_coupons_select" ON public.discount_coupons;
CREATE POLICY "discount_coupons_select_authenticated"
  ON public.discount_coupons
  FOR SELECT
  TO authenticated
  USING (
    (is_active = true) OR is_user_admin(( SELECT auth.uid() AS uid))
  );

-- Fix 2: Restrict app_settings SELECT — business rules shouldn't be public
DROP POLICY IF EXISTS "app_settings_select" ON public.app_settings;
CREATE POLICY "app_settings_select_authenticated"
  ON public.app_settings
  FOR SELECT
  TO authenticated
  USING (true);