-- Harden RLS on public.orders to prevent unauthorized inserts/updates

-- 1) Drop overly permissive policies
DROP POLICY IF EXISTS insert_order ON public.orders;
DROP POLICY IF EXISTS update_order ON public.orders;

-- 2) Ensure RLS is enabled (should already be, but safe to assert)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 3) User-scoped policies
-- Allow authenticated users to insert orders only for themselves
CREATE POLICY "Users can insert their own orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to update only their own orders
CREATE POLICY "Users can update their own orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Keep existing policy "select_own_orders" (users can view their own orders)
-- Add admin-wide access where appropriate using existing function public.is_admin_user

-- 4) Admin capabilities
-- Admins can view all orders
CREATE POLICY "Admins can select all orders"
ON public.orders
FOR SELECT
TO authenticated
USING (public.is_admin_user(auth.uid()));

-- Admins can update all orders
CREATE POLICY "Admins can update all orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (public.is_admin_user(auth.uid()));
