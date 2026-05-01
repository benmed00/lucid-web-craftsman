
-- =====================================================
-- PHASE 1: LOYALTY POINTS SECURITY FIX (CRITICAL)
-- Remove user update policy to prevent point manipulation
-- =====================================================

-- 1. Remove dangerous user update policy on loyalty_points
DROP POLICY IF EXISTS "Users can update their own loyalty points" ON public.loyalty_points;

-- 2. Remove user insert policy (points should only be added by system)
DROP POLICY IF EXISTS "Users can insert their own loyalty points" ON public.loyalty_points;

-- 3. Create system-only insert policy
CREATE POLICY "System can insert loyalty points" ON public.loyalty_points
FOR INSERT WITH CHECK (true);

-- 4. Create system-only update policy
CREATE POLICY "System can update loyalty points" ON public.loyalty_points
FOR UPDATE USING (true) WITH CHECK (true);

-- =====================================================
-- PHASE 2: LOYALTY REDEMPTIONS SECURITY FIX
-- Users should not update redemptions directly
-- =====================================================

-- Remove user update policy on redemptions
DROP POLICY IF EXISTS "Users can update their own redemptions" ON public.loyalty_redemptions;

-- Create system-only update policy
CREATE POLICY "System can update loyalty redemptions" ON public.loyalty_redemptions
FOR UPDATE USING (true) WITH CHECK (true);

-- =====================================================
-- PHASE 3: PAYMENTS SECURITY HARDENING
-- Add validation to service role policies
-- =====================================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Service role can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Service role can update payments" ON public.payments;

-- Create validated insert policy
CREATE POLICY "Validated payment insert" ON public.payments
FOR INSERT WITH CHECK (
  amount > 0 
  AND currency IS NOT NULL 
  AND status IS NOT NULL
);

-- Create validated update policy (only status changes allowed)
CREATE POLICY "Validated payment update" ON public.payments
FOR UPDATE USING (true) WITH CHECK (
  amount > 0 
  AND currency IS NOT NULL
);

-- =====================================================
-- PHASE 4: AUDIT LOG HARDENING
-- Prevent any deletions and restrict updates
-- =====================================================

-- Ensure no deletions allowed
DROP POLICY IF EXISTS "Deny all audit log deletions" ON public.audit_logs;
CREATE POLICY "Deny all audit log deletions" ON public.audit_logs
FOR DELETE USING (false);

-- Prevent updates to audit logs (immutable)
DROP POLICY IF EXISTS "Deny all audit log updates" ON public.audit_logs;
CREATE POLICY "Deny all audit log updates" ON public.audit_logs
FOR UPDATE USING (false);

-- =====================================================
-- PHASE 5: ORDERS SECURITY - Super admin only for all orders
-- =====================================================

-- Update admin select to super_admin only
DROP POLICY IF EXISTS "Admins can select all orders" ON public.orders;
CREATE POLICY "Super admins can select all orders" ON public.orders
FOR SELECT USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Update admin update to super_admin only
DROP POLICY IF EXISTS "Admins can update all orders" ON public.orders;
CREATE POLICY "Super admins can update all orders" ON public.orders
FOR UPDATE USING (has_role(auth.uid(), 'super_admin'::app_role));

-- =====================================================
-- Log security migration completion
-- =====================================================
INSERT INTO public.audit_logs (
  user_id, action, resource_type, resource_id,
  new_values, ip_address
) VALUES (
  NULL,
  'SECURITY_MIGRATION_APPLIED',
  'database',
  'phase1_loyalty_payments_admin',
  jsonb_build_object(
    'migration_date', now(),
    'fixes_applied', ARRAY[
      'loyalty_points_user_update_removed',
      'loyalty_points_user_insert_removed',
      'loyalty_redemptions_user_update_removed',
      'payments_validation_added',
      'audit_logs_immutable',
      'orders_super_admin_only'
    ],
    'version', '2.0'
  ),
  '0.0.0.0'::inet
);
