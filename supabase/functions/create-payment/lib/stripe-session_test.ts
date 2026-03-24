import { assertEquals } from '@std/assert';

import type { ShippingAddressPayload } from '../types.ts';
import {
  buildCheckoutSessionCreateParams,
  prefillStripeAddressFromShipping,
} from './stripe-session.ts';

Deno.test('prefillStripeAddressFromShipping', () => {
  const shipping: ShippingAddressPayload = {
    first_name: 'A',
    last_name: 'B',
    email: 'e@e.com',
    phone: null,
    address_line1: 'L1',
    address_line2: null,
    city: 'C',
    postal_code: 'P',
    country: 'FR',
  };
  const pre = prefillStripeAddressFromShipping(shipping);
  assertEquals(pre.line1, 'L1');
  assertEquals(pre.postal_code, 'P');
  assertEquals(pre.country, 'FR');
});

Deno.test('buildCheckoutSessionCreateParams: metadata and URLs', () => {
  const params = buildCheckoutSessionCreateParams({
    customerId: undefined,
    customerInfo: { email: 'c@test.com', firstName: 'C', lastName: 'D' },
    lineItems: [
      {
        price_data: {
          currency: 'eur',
          product_data: { name: 'Item', description: 'D' },
          unit_amount: 500,
        },
        quantity: 1,
      },
    ],
    siteBaseUrl: 'https://shop.example',
    shippingAddress: null,
    verifiedDiscountCode: null,
    discountAmountCents: 0,
    hasFreeShipping: false,
    orderId: '11111111-2222-3333-4444-555555555555',
    correlationId: 'corr-1',
    guestMetadata: null,
  });
  assertEquals(params.mode, 'payment');
  assertEquals(
    params.success_url,
    'https://shop.example/order-confirmation?order_id=11111111-2222-3333-4444-555555555555'
  );
  assertEquals(
    params.metadata?.order_id,
    '11111111-2222-3333-4444-555555555555'
  );
  assertEquals(params.metadata?.correlation_id, 'corr-1');
});
