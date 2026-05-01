-- Authoritative post-payment pricing: Stripe webhook writes immutable snapshot + integer minor units.
-- Legacy `orders.amount` has mixed units across eras (some rows in cents, some in euros);
-- this migration does NOT touch those values and only populates the new minor-unit columns
-- for rows where the unit is provably cents.

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
  'Grand total in smallest currency unit (session.amount_total). NULL on rows that pre-date the pricing snapshot and whose legacy amount unit cannot be proven.';

-- Unit-safe backfill.
--
-- The create-payment Edge Function writes `amount` in CENTS and always sets
-- `stripe_session_id`. Rows that satisfy BOTH conditions below are guaranteed
-- to be in cents, so casting to bigint is lossless and correct.
--
-- Rows without `stripe_session_id` (manual / COD / legacy imports) may be in
-- euros (decimal) or cents depending on the era; we deliberately leave their
-- `total_amount` NULL so callers must fall back to `amount` with their own
-- unit handling instead of silently reading off-by-100x values.
UPDATE public.orders
SET total_amount = amount::bigint
WHERE total_amount IS NULL
  AND amount IS NOT NULL
  AND stripe_session_id IS NOT NULL;

-- Repair rows already clobbered by a previous (unit-unsafe) run of this
-- migration on an environment where it had no stripe_session_id filter.
-- If total_amount was copied from a decimal-euros amount column, it is
-- <= amount (truncated) and therefore smaller than the true cents value.
-- We can't reliably reconstruct it, so we null it out: read paths must
-- then prefer pricing_snapshot or the legacy amount column, not a wrong
-- minor-unit mirror.
UPDATE public.orders
SET total_amount = NULL
WHERE stripe_session_id IS NULL
  AND pricing_snapshot IS NULL
  AND total_amount IS NOT NULL;
