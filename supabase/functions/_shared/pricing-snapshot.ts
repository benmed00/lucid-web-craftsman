/**
 * Single source of truth for paid-order money: Stripe Checkout Session + line items.
 * All amounts are in the smallest currency unit (e.g. cents) to match Stripe APIs.
 */

/** Narrow shapes — avoids coupling Deno tests to npm:stripe resolution. */
export type StripeSessionLike = {
  id: string;
  currency?: string | null;
  amount_subtotal?: number | null;
  amount_total?: number | null;
  total_details?: {
    amount_discount?: number | null;
    amount_shipping?: number | null;
    amount_tax?: number | null;
  } | null;
};

export type StripeLineItemLike = {
  description?: string | null;
  quantity?: number | null;
  amount_total?: number | null;
};

export type PricingLineV1 = {
  description: string;
  quantity: number;
  /** Unit price in minor units (Stripe line amount_total / quantity). */
  unit_minor: number;
  line_total_minor: number;
};

export type PricingSnapshotV1 = {
  version: 1;
  currency: string;
  source: 'stripe_checkout_session';
  stripe_session_id: string;
  subtotal_minor: number;
  discount_minor: number;
  shipping_minor: number;
  tax_minor: number;
  total_minor: number;
  lines: PricingLineV1[];
  finalized_at: string;
};

/** Build immutable snapshot from Stripe (authoritative after payment). */
export function buildPricingSnapshotV1FromStripe(
  session: StripeSessionLike,
  lineItems: StripeLineItemLike[]
): PricingSnapshotV1 {
  const currency = (session.currency || 'eur').toLowerCase();
  const subtotal = session.amount_subtotal ?? 0;
  const total = session.amount_total ?? 0;
  const td = session.total_details;

  const lines: PricingLineV1[] = lineItems.map((li) => {
    const qty = li.quantity ?? 1;
    const lineTotal = li.amount_total ?? 0;
    const unit = qty > 0 ? Math.round(lineTotal / qty) : lineTotal;
    return {
      description: (li.description || 'Article').trim(),
      quantity: qty,
      unit_minor: unit,
      line_total_minor: lineTotal,
    };
  });

  return {
    version: 1,
    currency,
    source: 'stripe_checkout_session',
    stripe_session_id: session.id,
    subtotal_minor: subtotal,
    discount_minor: td?.amount_discount ?? 0,
    shipping_minor: td?.amount_shipping ?? 0,
    tax_minor: td?.amount_tax ?? 0,
    total_minor: total,
    lines,
    finalized_at: new Date().toISOString(),
  };
}

/** True when this line is the synthetic shipping row from our Checkout session. */
export function isShippingLineDescription(description: string): boolean {
  const d = description.toLowerCase();
  return (
    d.includes('frais de livraison') ||
    d.includes('livraison standard') ||
    d === 'shipping' ||
    d.includes('shipping')
  );
}