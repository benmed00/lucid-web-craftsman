
-- ============================================================================
-- FIX 1: SECURITY DEFINER functions - Revoke public access to sensitive RPCs
-- ============================================================================

-- Revoke public/authenticated access to loyalty functions (financial impact)
REVOKE EXECUTE ON FUNCTION public.add_loyalty_points(uuid, integer, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_loyalty_points(uuid, integer, text, text, text, text) TO service_role;

-- Handle the other overload if it exists
DO $$
BEGIN
  REVOKE EXECUTE ON FUNCTION public.add_loyalty_points(uuid, integer, text, text, text) FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.add_loyalty_points(uuid, integer, text, text, text) TO service_role;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

REVOKE EXECUTE ON FUNCTION public.update_loyalty_tier(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_loyalty_tier(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.init_loyalty_account(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.init_loyalty_account(uuid) TO service_role;

-- Revoke access to security event logging (prevent log poisoning)
DO $$
BEGIN
  REVOKE EXECUTE ON FUNCTION public.log_security_event(text, text, jsonb, uuid) FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.log_security_event(text, text, jsonb, uuid) TO service_role;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  REVOKE EXECUTE ON FUNCTION public.log_security_event(text, text, jsonb) FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.log_security_event(text, text, jsonb) TO service_role;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- Revoke access to admin-only functions
DO $$
BEGIN
  REVOKE EXECUTE ON FUNCTION public.add_admin_user(uuid, text, text, boolean) FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.add_admin_user(uuid, text, text, boolean) TO service_role;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  REVOKE EXECUTE ON FUNCTION public.confirm_order_payment(uuid, text, numeric, text) FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.confirm_order_payment(uuid, text, numeric, text) TO service_role;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  REVOKE EXECUTE ON FUNCTION public.calculate_fraud_score FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.calculate_fraud_score TO service_role;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  REVOKE EXECUTE ON FUNCTION public.emergency_lockdown_contact_data() FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.emergency_lockdown_contact_data() TO service_role;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  REVOKE EXECUTE ON FUNCTION public.mark_alerts_notified(uuid[]) FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.mark_alerts_notified(uuid[]) TO service_role;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- ============================================================================
-- FIX 2: Harden guest checkout_sessions - add expiry enforcement to RLS
-- ============================================================================

-- Drop and recreate guest SELECT policy to enforce session expiry
DROP POLICY IF EXISTS "checkout_sessions_guest_select" ON public.checkout_sessions;
CREATE POLICY "checkout_sessions_guest_select"
ON public.checkout_sessions FOR SELECT
USING (
  guest_id IS NOT NULL 
  AND guest_id = get_request_guest_id()
  AND (expires_at IS NULL OR expires_at > now())
  AND status NOT IN ('completed', 'abandoned')
);

-- Drop and recreate guest UPDATE policy to enforce session expiry  
DROP POLICY IF EXISTS "checkout_sessions_guest_update" ON public.checkout_sessions;
CREATE POLICY "checkout_sessions_guest_update"
ON public.checkout_sessions FOR UPDATE
USING (
  guest_id IS NOT NULL 
  AND guest_id = get_request_guest_id()
  AND (expires_at IS NULL OR expires_at > now())
  AND status NOT IN ('completed', 'abandoned')
)
WITH CHECK (
  guest_id IS NOT NULL 
  AND guest_id = get_request_guest_id()
);

-- Drop and recreate guest INSERT policy (keep existing logic)
DROP POLICY IF EXISTS "checkout_sessions_guest_insert" ON public.checkout_sessions;
CREATE POLICY "checkout_sessions_guest_insert"
ON public.checkout_sessions FOR INSERT
WITH CHECK (
  guest_id IS NOT NULL 
  AND guest_id = get_request_guest_id()
);
