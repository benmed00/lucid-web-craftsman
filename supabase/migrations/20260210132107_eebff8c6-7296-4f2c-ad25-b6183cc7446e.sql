-- Fix #6: Add missing index on orders.status for admin dashboard performance
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);

-- Fix #7: Remove duplicate unique constraint on stripe_session_id
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS uniq_stripe_session;

-- Fix #4: Clean up orphaned 'created' orders with stripe sessions older than 48h
UPDATE public.orders
SET status = 'cancelled',
    order_status = 'cancelled',
    metadata = jsonb_set(
      COALESCE(metadata::jsonb, '{}'::jsonb),
      '{cancelled_reason}',
      '"cleanup_orphaned_pending"'
    ),
    updated_at = now()
WHERE status = 'created'
  AND stripe_session_id IS NOT NULL
  AND created_at < now() - interval '48 hours';

-- Fix #1: Document amount unit
COMMENT ON COLUMN public.orders.amount IS 'Amount in cents (EUR). Orders before 2026-02-09 may store euros instead of cents.';