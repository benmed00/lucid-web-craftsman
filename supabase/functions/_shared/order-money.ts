/**
 * Authoritative paid totals on `orders`.
 *
 * Prefer `total_amount` (Stripe minor units, written with pricing_snapshot).
 * Fallback: legacy `amount` — for Stripe-checkout rows this is **minor units (cents)** per
 * create-payment DATA_FLOW; do not multiply by 100.
 *
 * **Note:** Some older planning docs assumed legacy `amount` was major currency units and
 * proposed `× 100`; this codebase and migrations (`20260324183000_order_pricing_snapshot`)
 * intentionally treat Stripe-era `amount` as minor units — see `docs/PLATFORM.md` (“Legacy amount units”).
 */

export function authoritativeTotalMinor(order: {
  total_amount?: number | null;
  amount?: number | null;
}): number {
  if (
    typeof order.total_amount === 'number' &&
    !Number.isNaN(order.total_amount)
  ) {
    return order.total_amount;
  }
  const a = Number(order.amount ?? 0);
  return Number.isFinite(a) ? Math.round(a) : 0;
}

export function authoritativeTotalMajor(order: {
  total_amount?: number | null;
  amount?: number | null;
}): number {
  return authoritativeTotalMinor(order) / 100;
}
