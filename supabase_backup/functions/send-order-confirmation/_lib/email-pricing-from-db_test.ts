import { assertEquals } from 'https://deno.land/std@0.190.0/testing/asserts.ts';
import {
  buildEmailPricingFromSnapshot,
  isPricingSnapshotV1,
} from './email-pricing-from-db.ts';

Deno.test('isPricingSnapshotV1 validates v1 shape', () => {
  assertEquals(
    isPricingSnapshotV1({
      version: 1,
      currency: 'eur',
      subtotal_minor: 100,
      discount_minor: 0,
      shipping_minor: 0,
      total_minor: 100,
      lines: [],
    }),
    true
  );
  assertEquals(isPricingSnapshotV1({ version: 2 }), false);
});

Deno.test(
  'buildEmailPricingFromSnapshot converts minors to display euros',
  () => {
    const snap = {
      version: 1 as const,
      currency: 'eur',
      subtotal_minor: 6200,
      discount_minor: 6100,
      shipping_minor: 0,
      total_minor: 100,
      lines: [
        {
          description: 'Bag',
          quantity: 1,
          unit_minor: 100,
          line_total_minor: 100,
        },
      ],
    };
    const out = buildEmailPricingFromSnapshot(snap, [
      {
        product_id: 1,
        quantity: 1,
        product_snapshot: { images: ['https://x/img.jpg'] },
      },
    ]);
    assertEquals(out.items.length, 1);
    assertEquals(out.items[0]!.price, 1);
    assertEquals(out.items[0]!.name, 'Bag');
    assertEquals(out.subtotal, 62);
    assertEquals(out.discount, 61);
    assertEquals(out.total, 1);
  }
);
