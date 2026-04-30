-- Both are constraints, not just indexes
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_stripe_session_id_key;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_stripe_session_id_unique;

-- Add unique constraint on payment_reference (payment_intent_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_payment_reference_unique
  ON public.orders (payment_reference)
  WHERE payment_reference IS NOT NULL;