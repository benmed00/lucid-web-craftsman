import { describe, expect, it } from 'vitest';

import { pricingSnapshotV1Schema } from './pricingSnapshot';

describe('pricingSnapshotV1Schema', () => {
  it('accepts a v1 Stripe-shaped snapshot', () => {
    const raw = {
      version: 1,
      currency: 'eur',
      source: 'stripe_checkout_session',
      stripe_session_id: 'cs_x',
      subtotal_minor: 6200,
      discount_minor: 100,
      shipping_minor: 0,
      tax_minor: 0,
      total_minor: 6100,
      lines: [
        {
          description: 'Item',
          quantity: 1,
          unit_minor: 6100,
          line_total_minor: 6100,
        },
      ],
      finalized_at: new Date().toISOString(),
    };
    const r = pricingSnapshotV1Schema.safeParse(raw);
    expect(r.success).toBe(true);
  });
});
