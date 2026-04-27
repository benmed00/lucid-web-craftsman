import { assertEquals } from 'https://deno.land/std@0.190.0/testing/asserts.ts';

import {
  buildPricingSnapshotV1FromStripe,
  isShippingLineDescription,
  type StripeLineItemLike,
  type StripeSessionLike,
} from './pricing-snapshot.ts';

Deno.test('currency is normalized to lowercase', () => {
  const session: StripeSessionLike = {
    id: 'cs_1',
    currency: 'EUR',
    amount_subtotal: 1000,
    amount_total: 1000,
  };
  const snap = buildPricingSnapshotV1FromStripe(session, []);
  assertEquals(snap.currency, 'eur');
  assertEquals(snap.source, 'stripe_checkout_session');
  assertEquals(snap.version, 1);
  assertEquals(snap.stripe_session_id, 'cs_1');
});

Deno.test('defaults currency to eur when missing', () => {
  const snap = buildPricingSnapshotV1FromStripe({ id: 'cs_2' }, []);
  assertEquals(snap.currency, 'eur');
  assertEquals(snap.subtotal_minor, 0);
  assertEquals(snap.total_minor, 0);
  assertEquals(snap.discount_minor, 0);
  assertEquals(snap.shipping_minor, 0);
  assertEquals(snap.tax_minor, 0);
});

Deno.test('total_details fields map to discount/shipping/tax', () => {
  const session: StripeSessionLike = {
    id: 'cs_3',
    currency: 'eur',
    amount_subtotal: 5000,
    amount_total: 5500,
    total_details: {
      amount_discount: 500,
      amount_shipping: 800,
      amount_tax: 200,
    },
  };
  const snap = buildPricingSnapshotV1FromStripe(session, []);
  assertEquals(snap.discount_minor, 500);
  assertEquals(snap.shipping_minor, 800);
  assertEquals(snap.tax_minor, 200);
  assertEquals(snap.subtotal_minor, 5000);
  assertEquals(snap.total_minor, 5500);
});

Deno.test('multi-line items compute unit_minor by quantity', () => {
  const lines: StripeLineItemLike[] = [
    { description: 'Hat A', quantity: 2, amount_total: 6000 },
    { description: 'Hat B', quantity: 3, amount_total: 9000 },
  ];
  const snap = buildPricingSnapshotV1FromStripe(
    { id: 'cs_4', currency: 'eur', amount_subtotal: 15000, amount_total: 15000 },
    lines
  );
  assertEquals(snap.lines.length, 2);
  assertEquals(snap.lines[0]!.unit_minor, 3000);
  assertEquals(snap.lines[0]!.line_total_minor, 6000);
  assertEquals(snap.lines[0]!.quantity, 2);
  assertEquals(snap.lines[1]!.unit_minor, 3000);
  assertEquals(snap.lines[1]!.line_total_minor, 9000);
});

Deno.test('line with missing description falls back to "Article"', () => {
  const snap = buildPricingSnapshotV1FromStripe(
    { id: 'cs_5' },
    [{ quantity: 1, amount_total: 100 }]
  );
  assertEquals(snap.lines[0]!.description, 'Article');
});

Deno.test('line with zero/missing quantity does not divide by zero', () => {
  const snap = buildPricingSnapshotV1FromStripe(
    { id: 'cs_6' },
    [{ description: 'X', quantity: 0, amount_total: 500 }]
  );
  assertEquals(snap.lines[0]!.unit_minor, 500);
  assertEquals(snap.lines[0]!.line_total_minor, 500);
  assertEquals(snap.lines[0]!.quantity, 0);
});

Deno.test('line description is trimmed', () => {
  const snap = buildPricingSnapshotV1FromStripe(
    { id: 'cs_7' },
    [{ description: '  Pochette  ', quantity: 1, amount_total: 100 }]
  );
  assertEquals(snap.lines[0]!.description, 'Pochette');
});

Deno.test('finalized_at is ISO-8601', () => {
  const snap = buildPricingSnapshotV1FromStripe({ id: 'cs_8' }, []);
  assertEquals(Number.isNaN(Date.parse(snap.finalized_at)), false);
});

Deno.test('isShippingLineDescription matches French + English variants', () => {
  assertEquals(isShippingLineDescription('Frais de livraison'), true);
  assertEquals(isShippingLineDescription('Livraison standard'), true);
  assertEquals(isShippingLineDescription('Shipping'), true);
  assertEquals(isShippingLineDescription('shipping fees'), true);
  assertEquals(isShippingLineDescription('Pochette'), false);
});
