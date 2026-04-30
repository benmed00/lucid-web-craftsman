-- Fix 1: Remove user self-update on orders (critical: users can change amount/status)
-- Replace with admin-only update policy
DROP POLICY IF EXISTS "orders_update" ON public.orders;
CREATE POLICY "orders_update_admin_only"
  ON public.orders
  FOR UPDATE
  USING (is_admin_user(( SELECT auth.uid() AS uid)))
  WITH CHECK (is_admin_user(( SELECT auth.uid() AS uid)));

-- Fix 2: Remove user self-insert on loyalty_transactions (critical: users can self-issue points)
-- Replace with admin-only insert policy
DROP POLICY IF EXISTS "lt_insert" ON public.loyalty_transactions;
CREATE POLICY "lt_insert_admin_only"
  ON public.loyalty_transactions
  FOR INSERT
  WITH CHECK (is_admin_user(( SELECT auth.uid() AS uid)));
