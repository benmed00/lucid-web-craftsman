CREATE OR REPLACE FUNCTION public.confirm_order_payment(p_order_id uuid, p_payment_intent text, p_amount numeric, p_currency text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  insufficient_count INTEGER;
BEGIN
  -- 1. Lock the order row
  PERFORM 1
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  -- 2. Mark order as paid (idempotent)
  UPDATE orders
  SET status = 'paid',
      order_status = 'paid',
      updated_at = now()
  WHERE id = p_order_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- 3. Check stock
  SELECT COUNT(*)
  INTO insufficient_count
  FROM order_items oi
  JOIN products p ON p.id = oi.product_id
  WHERE oi.order_id = p_order_id
    AND p.stock_quantity < oi.quantity;

  IF insufficient_count > 0 THEN
    RAISE EXCEPTION 'Stock insuffisant pour un ou plusieurs produits';
  END IF;

  -- 4. Decrement stock
  UPDATE products p
  SET stock_quantity = p.stock_quantity - oi.quantity
  FROM order_items oi
  WHERE oi.order_id = p_order_id
    AND p.id = oi.product_id;

  -- 5. Record payment (idempotent via unique constraint)
  INSERT INTO payments (
    id, order_id, stripe_payment_intent_id, amount, currency, status, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), p_order_id, p_payment_intent, p_amount, p_currency, 'paid', now(), now()
  )
  ON CONFLICT (stripe_payment_intent_id) DO NOTHING;
END;
$function$;