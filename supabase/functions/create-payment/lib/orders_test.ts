import { assertEquals } from '@std/assert';

import type { VerifiedCartItem } from '../types.ts';
import {
  buildShippingAddressPayload,
  mapVerifiedItemsToOrderInserts,
} from './orders.ts';

Deno.test('buildShippingAddressPayload: null without customerInfo', () => {
  assertEquals(buildShippingAddressPayload(undefined), null);
});

Deno.test(
  'buildShippingAddressPayload: maps camelCase → snake_case columns',
  () => {
    const payload = buildShippingAddressPayload({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'j@example.com',
      phone: '+330000',
      address: '1 rue',
      addressComplement: '',
      city: 'Paris',
      postalCode: '75001',
      country: '',
    });
    assertEquals(payload?.first_name, 'Jane');
    assertEquals(payload?.last_name, 'Doe');
    assertEquals(payload?.email, 'j@example.com');
    assertEquals(payload?.postal_code, '75001');
    assertEquals(payload?.country, 'FR');
  }
);

Deno.test('mapVerifiedItemsToOrderInserts: order row + snapshot', () => {
  const items: VerifiedCartItem[] = [
    {
      product: {
        id: 7,
        name: 'Bag',
        price: 49.5,
        description: 'Leather',
        images: [],
      },
      quantity: 2,
    },
  ];
  const inserts = mapVerifiedItemsToOrderInserts('order-uuid', items);
  assertEquals(inserts.length, 1);
  assertEquals(inserts[0].order_id, 'order-uuid');
  assertEquals(inserts[0].product_id, 7);
  assertEquals(inserts[0].quantity, 2);
  assertEquals(inserts[0].unit_price, 49.5);
  assertEquals(inserts[0].total_price, 99);
  assertEquals(inserts[0].product_snapshot.name, 'Bag');
});
