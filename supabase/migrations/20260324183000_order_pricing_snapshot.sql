-- Authoritative post-payment pricing: Stripe webhook writes immutable snapshot + integer minor units.
-- Legacy `orders.amount` remains (cents) for backward compatibility; new columns mirror Stripe totals.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS pricing_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS subtotal_amount BIGINT,
  ADD COLUMN IF NOT EXISTS discount_amount BIGINT,
  ADD COLUMN IF NOT EXISTS shipping_amount BIGINT,
  ADD COLUMN IF NOT EXISTS total_amount BIGINT;

COMMENT ON COLUMN public.orders.pricing_snapshot IS
  'Immutable pricing breakdown after payment (Stripe checkout.session.completed). Versioned JSON; UI and email must prefer this over recomputation.';

COMMENT ON COLUMN public.orders.subtotal_amount IS
  'Subtotal in smallest currency unit (e.g. cents), from Stripe at payment time.';

COMMENT ON COLUMN public.orders.discount_amount IS
  'Total discount in smallest currency unit, from Stripe total_details.amount_discount.';

COMMENT ON COLUMN public.orders.shipping_amount IS
  'Shipping in smallest currency unit, from Stripe total_details.amount_shipping.';

COMMENT ON COLUMN public.orders.total_amount IS
  'Grand total in smallest currency unit (session.amount_total).';

-- Backfill total_amount from existing amount where possible
UPDATE public.orders
SET total_amount = COALESCE(amount::bigint, 0)
WHERE total_amount IS NULL AND amount IS NOT NULL;
