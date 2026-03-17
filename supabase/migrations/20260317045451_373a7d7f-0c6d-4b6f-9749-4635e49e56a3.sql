
-- Atomic cart sync RPC: replaces the select→delete→upsert pattern
-- Runs in a single transaction to prevent race conditions
CREATE OR REPLACE FUNCTION public.sync_cart(
  p_user_id uuid,
  p_items jsonb  -- array of {product_id: int, quantity: int}
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete items not in the new set
  DELETE FROM cart_items
  WHERE user_id = p_user_id
    AND product_id NOT IN (
      SELECT (item->>'product_id')::int
      FROM jsonb_array_elements(p_items) AS item
    );

  -- Upsert all current items
  INSERT INTO cart_items (user_id, product_id, quantity, updated_at)
  SELECT
    p_user_id,
    (item->>'product_id')::int,
    LEAST((item->>'quantity')::int, 99),
    now()
  FROM jsonb_array_elements(p_items) AS item
  WHERE (item->>'product_id')::int IS NOT NULL
    AND (item->>'quantity')::int > 0
  ON CONFLICT (user_id, product_id)
  DO UPDATE SET
    quantity = LEAST(EXCLUDED.quantity, 99),
    updated_at = now();
END;
$$;

-- Add unique constraint on orders.stripe_session_id for idempotency
-- (only if column exists and constraint doesn't already exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'stripe_session_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_stripe_session_id_unique'
  ) THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_stripe_session_id_unique UNIQUE (stripe_session_id);
  END IF;
END $$;
