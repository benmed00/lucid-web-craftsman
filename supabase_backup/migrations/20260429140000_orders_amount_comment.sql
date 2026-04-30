/** Commentary-only migration — preserves backward-compat semantics documented in migrations 20260324*. */
COMMENT ON COLUMN public.orders.amount IS
  'Legacy cart-time total (minor units for Stripe-checkout flows). Prefer total_amount and pricing_snapshot after payment; see docs/PLATFORM.md.';
