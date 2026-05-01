import { assertEquals } from 'https://deno.land/std@0.190.0/testing/asserts.ts';
import {
  buildPricingSnapshotV1FromStripe,
  isShippingLineDescription,
} from './pricing-snapshot.ts';

Deno.test(
  'buildPricingSnapshotV1FromStripe maps Stripe totals and lines',
  () => {
    const session = {
      id: 'cs_test_1',
      currency: 'eur',
      amount_subtotal: 6200,
      amount_total: 62,
      total_details: {
        amount_discount: 6138,
        amount_shipping: 0,
        amount_tax: 0,
      },
    };

    const lineItems = [
      {
        description: 'Pochette',
        quantity: 1,
        amount_total: 62,
      },
    ];

    const snap = buildPricingSnapshotV1FromStripe(session, lineItems);
    assertEquals(snap.version, 1);
    assertEquals(snap.subtotal_minor, 6200);
    assertEquals(snap.discount_minor, 6138);
    assertEquals(snap.total_minor, 62);
    assertEquals(snap.lines.length, 1);
    assertEquals(snap.lines[0]!.unit_minor, 62);
    assertEquals(snap.lines[0]!.line_total_minor, 62);
  }
);

Deno.test('isShippingLineDescription detects French shipping row', () => {
  assertEquals(isShippingLineDescription('Frais de livraison'), true);
  assertEquals(isShippingLineDescription('Pochette'), false);
});
