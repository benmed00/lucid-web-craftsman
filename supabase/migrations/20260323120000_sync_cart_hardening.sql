-- Harden sync_cart: reject null user, tolerate null/invalid jsonb, avoid cast errors
CREATE OR REPLACE FUNCTION public.sync_cart(
  p_user_id uuid,
  p_items jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'sync_cart: p_user_id is required';
  END IF;

  DELETE FROM cart_items
  WHERE user_id = p_user_id
    AND product_id NOT IN (
      SELECT (item->>'product_id')::int
      FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb)) AS item
      WHERE (item->>'product_id') ~ '^[0-9]+$'
        AND (item->>'quantity') ~ '^[0-9]+$'
        AND (item->>'quantity')::int > 0
    );

  INSERT INTO cart_items (user_id, product_id, quantity, updated_at)
  SELECT
    p_user_id,
    (item->>'product_id')::int,
    LEAST((item->>'quantity')::int, 99),
    now()
  FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb)) AS item
  WHERE (item->>'product_id') ~ '^[0-9]+$'
    AND (item->>'quantity') ~ '^[0-9]+$'
    AND (item->>'quantity')::int > 0
  ON CONFLICT (user_id, product_id)
  DO UPDATE SET
    quantity = LEAST(EXCLUDED.quantity, 99),
    updated_at = now();
END;
$$;
