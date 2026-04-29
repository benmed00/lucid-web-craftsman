/**
 * Extra mapping cases: JPY zero-decimal, anonymized Stripe-shaped JSON, line-count sanity.
 *
 * Prerequisites: Deno 2; `--allow-read` for `fixtures/stripe_checkout_session_anonymized.json`; `--config supabase/functions/deno.json`.
 * Run: `npm run test:pricing-snapshot:deno`
 */
import { assertEquals } from 'https://deno.land/std@0.190.0/testing/asserts.ts';

import {
  buildPricingSnapshotV1FromStripe,
  type StripeLineItemLike,
  type StripeSessionLike,
} from './pricing-snapshot.ts';

Deno.test('JPY session uses integer minor units (no fractional yen)', () => {
  const session: StripeSessionLike = {
    id: 'cs_jpy',
    currency: 'jpy',
    amount_subtotal: 5000,
    amount_total: 5500,
    total_details: {
      amount_discount: 0,
      amount_shipping: 500,
      amount_tax: 0,
    },
  };
  const lines: StripeLineItemLike[] = [
    { description: 'おみやげ', quantity: 1, amount_total: 5000 },
  ];
  const snap = buildPricingSnapshotV1FromStripe(session, lines);
  assertEquals(snap.currency, 'jpy');
  assertEquals(snap.subtotal_minor, 5000);
  assertEquals(snap.total_minor, 5500);
  assertEquals(snap.shipping_minor, 500);
  assertEquals(snap.lines[0]!.unit_minor, 5000);
  assertEquals(snap.lines[0]!.line_total_minor, 5000);
});

Deno.test(
  'anonymized Stripe checkout fixture maps to expected snapshot totals',
  async () => {
    const fixtureUrl = new URL(
      './fixtures/stripe_checkout_session_anonymized.json',
      import.meta.url
    );
    const raw = JSON.parse(await Deno.readTextFile(fixtureUrl)) as {
      id: string;
      currency: string;
      amount_subtotal: number;
      amount_total: number;
      total_details: Record<string, number>;
      line_items: { data: StripeLineItemLike[] };
    };
    const session: StripeSessionLike = {
      id: raw.id,
      currency: raw.currency,
      amount_subtotal: raw.amount_subtotal,
      amount_total: raw.amount_total,
      total_details: raw.total_details,
    };
    const snap = buildPricingSnapshotV1FromStripe(session, raw.line_items.data);
    assertEquals(snap.stripe_session_id, 'cs_fixture_anonymized_001');
    assertEquals(snap.subtotal_minor, 6200);
    assertEquals(snap.discount_minor, 100);
    assertEquals(snap.shipping_minor, 500);
    assertEquals(snap.tax_minor, 200);
    assertEquals(snap.total_minor, 6800);
    assertEquals(snap.lines.length, 2);
  }
);

Deno.test('many line items (100) preserve count and sum line totals', () => {
  const lines: StripeLineItemLike[] = Array.from({ length: 100 }, (_, i) => ({
    description: `Item ${i}`,
    quantity: 1,
    amount_total: 100,
  }));
  const session: StripeSessionLike = {
    id: 'cs_many_lines',
    currency: 'eur',
    amount_subtotal: 10000,
    amount_total: 10000,
  };
  const snap = buildPricingSnapshotV1FromStripe(session, lines);
  assertEquals(snap.lines.length, 100);
  assertEquals(
    snap.lines.reduce((s, l) => s + l.line_total_minor, 0),
    10000
  );
});
