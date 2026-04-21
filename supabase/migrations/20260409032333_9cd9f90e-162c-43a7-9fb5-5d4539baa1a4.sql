CREATE OR REPLACE FUNCTION public.cleanup_stale_pending_orders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cleaned_count integer;
  cancelled_ids uuid[];
BEGIN
  -- Cancel stale pending orders (status is text column, 'pending' is valid)
  WITH cancelled AS (
    UPDATE orders
    SET 
      status = 'cancelled',
      order_status = 'cancelled'::order_status,
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
  SELECT count(*), array_agg(id) INTO cleaned_count, cancelled_ids FROM cancelled;

  -- Log to history using correct enum values
  IF cleaned_count > 0 AND cancelled_ids IS NOT NULL THEN
    INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by, reason_code, reason_message)
    SELECT unnest(cancelled_ids), 'payment_pending'::order_status, 'cancelled'::order_status, 'scheduler'::status_change_actor, 'STALE_CLEANUP', 'Auto-cancelled: pending > 24 hours';
  END IF;

  RAISE LOG 'cleanup_stale_pending_orders: cancelled % orders', cleaned_count;
  
  RETURN cleaned_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cleanup_stale_pending_orders() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_stale_pending_orders() FROM anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_stale_pending_orders() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_stale_pending_orders() TO service_role;