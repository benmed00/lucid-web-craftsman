-- Fix: Allow anon users to validate active promo codes during guest checkout
-- The previous policy restricted to authenticated only, breaking guest promo validation
DROP POLICY IF EXISTS "discount_coupons_select_authenticated" ON public.discount_coupons;
CREATE POLICY "discount_coupons_select_active_only"
  ON public.discount_coupons
  FOR SELECT
  TO anon, authenticated
  USING (
    (is_active = true) OR is_user_admin(( SELECT auth.uid() AS uid))
  );