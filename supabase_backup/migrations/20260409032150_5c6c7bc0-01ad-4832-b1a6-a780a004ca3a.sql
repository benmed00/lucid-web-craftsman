-- ================================================================
-- PHASE 1: Fix guest order visibility
-- ================================================================

-- Drop the blanket deny for anon on orders
DROP POLICY IF EXISTS "deny_anonymous_orders_access" ON public.orders;

-- Replace orders_select to also allow guest read by guest_id
DROP POLICY IF EXISTS "orders_select" ON public.orders;

CREATE POLICY "orders_select" ON public.orders
FOR SELECT
TO anon, authenticated
USING (
  -- Authenticated user owns the order
  (user_id = (SELECT auth.uid()))
  -- Admin access
  OR has_role((SELECT auth.uid()), 'super_admin'::app_role)
  -- Guest access: order has no user_id AND guest_id in metadata matches request header
  OR (
    user_id IS NULL
    AND metadata->>'guest_id' IS NOT NULL
    AND metadata->>'guest_id' = get_request_guest_id()
  )
);

-- Restrict anon INSERT (guests should not insert orders directly via client)
CREATE POLICY "deny_anonymous_orders_insert" ON public.orders
FOR INSERT
TO anon
WITH CHECK (false);

-- Restrict anon UPDATE/DELETE
CREATE POLICY "deny_anonymous_orders_update" ON public.orders
FOR UPDATE
TO anon
USING (false);

CREATE POLICY "deny_anonymous_orders_delete" ON public.orders
FOR DELETE
TO anon
USING (false);

-- ================================================================
-- Fix guest order_items visibility
-- ================================================================

DROP POLICY IF EXISTS "deny_anonymous_order_items_access" ON public.order_items;

-- Update order_items_select to include guest access
DROP POLICY IF EXISTS "order_items_select" ON public.order_items;

CREATE POLICY "order_items_select" ON public.order_items
FOR SELECT
TO anon, authenticated
USING (
  -- Authenticated user owns the parent order
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = (SELECT auth.uid())
  )
  -- Admin access
  OR is_admin_user((SELECT auth.uid()))
  -- Guest access via parent order metadata
  OR EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id IS NULL
    AND orders.metadata->>'guest_id' IS NOT NULL
    AND orders.metadata->>'guest_id' = get_request_guest_id()
  )
);

-- Block anon from inserting/updating/deleting order_items
CREATE POLICY "deny_anonymous_order_items_insert" ON public.order_items
FOR INSERT
TO anon
WITH CHECK (false);

CREATE POLICY "deny_anonymous_order_items_update" ON public.order_items
FOR UPDATE
TO anon
USING (false);

CREATE POLICY "deny_anonymous_order_items_delete" ON public.order_items
FOR DELETE
TO anon
USING (false);

-- ================================================================
-- PHASE 3: Orphaned pending order cleanup function
-- ================================================================

CREATE OR REPLACE FUNCTION public.cleanup_stale_pending_orders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cleaned_count integer;
BEGIN
  WITH cancelled AS (
    UPDATE orders
    SET 
      status = 'cancelled',
      order_status = 'cancelled',
      updated_at = now(),
      metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{cancelled_reason}',
        '"stale_pending_cleanup"'
      )
    WHERE status = 'pending'
      AND created_at < now() - interval '24 hours'
    RETURNING id
  )
  SELECT count(*) INTO cleaned_count FROM cancelled;

  -- Log cleanup to order_status_history for each cancelled order
  INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by, reason_code, reason_message)
  SELECT id, 'pending', 'cancelled', 'system', 'STALE_CLEANUP', 'Auto-cancelled: pending > 24 hours'
  FROM orders
  WHERE status = 'cancelled'
    AND metadata->>'cancelled_reason' = 'stale_pending_cleanup'
    AND updated_at >= now() - interval '1 minute';

  RAISE LOG 'cleanup_stale_pending_orders: cancelled % orders', cleaned_count;
  
  RETURN cleaned_count;
END;
$$;

-- Restrict execution to service_role only
REVOKE EXECUTE ON FUNCTION public.cleanup_stale_pending_orders() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_stale_pending_orders() FROM anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_stale_pending_orders() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_stale_pending_orders() TO service_role;