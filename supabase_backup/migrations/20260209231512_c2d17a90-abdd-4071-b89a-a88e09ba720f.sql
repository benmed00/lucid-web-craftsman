
-- ========================================================================
-- FIX 1: Change default currency from 'usd' to 'eur'
-- ========================================================================
ALTER TABLE public.orders ALTER COLUMN currency SET DEFAULT 'eur';

-- ========================================================================
-- FIX 2: Synchronize existing order status data
-- Map free-text `status` to match `order_status` enum values
-- ========================================================================
UPDATE public.orders SET status = order_status::text WHERE status != order_status::text;

-- ========================================================================
-- FIX 3: Create trigger to keep `status` column in sync with `order_status`
-- `order_status` (enum) is the authoritative column
-- `status` (text) is kept for backward compatibility
-- ========================================================================
CREATE OR REPLACE FUNCTION public.sync_order_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When order_status changes, sync status text field
  IF NEW.order_status IS DISTINCT FROM OLD.order_status THEN
    NEW.status := NEW.order_status::text;
  END IF;
  -- When status text changes but order_status didn't, try to sync back
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.order_status IS NOT DISTINCT FROM OLD.order_status THEN
    BEGIN
      NEW.order_status := NEW.status::order_status;
    EXCEPTION WHEN invalid_text_representation THEN
      -- If status text isn't a valid enum value, keep order_status and override status
      NEW.status := NEW.order_status::text;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE TRIGGER trg_sync_order_status
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_order_status();

-- ========================================================================
-- FIX 4: Create increment_coupon_usage RPC (used by stripe-webhook)
-- ========================================================================
CREATE OR REPLACE FUNCTION public.increment_coupon_usage(p_code text)
RETURNS void AS $$
BEGIN
  UPDATE public.discount_coupons
  SET usage_count = COALESCE(usage_count, 0) + 1,
      updated_at = now()
  WHERE code = p_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Restrict to service_role only
REVOKE EXECUTE ON FUNCTION public.increment_coupon_usage(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_coupon_usage(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_coupon_usage(text) FROM authenticated;
