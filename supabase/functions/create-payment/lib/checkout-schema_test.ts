import { assertEquals, assertThrows } from '@std/assert';

import {
  CHECKOUT_VALIDATION_ERROR_PREFIX,
  MAX_CART_ITEMS,
} from '../constants.ts';
import { parseCheckoutRequestBody } from './checkout-schema.ts';

Deno.test('parseCheckoutRequestBody: accepts minimal valid payload', () => {
  const parsed = parseCheckoutRequestBody({
    items: [{ product: { id: 1 }, quantity: 2 }],
  });
  assertEquals(parsed.items.length, 1);
  assertEquals(parsed.items[0].product.id, 1);
  assertEquals(parsed.items[0].quantity, 2);
});

Deno.test(
  'parseCheckoutRequestBody: coerces string product id and quantity',
  () => {
    const parsed = parseCheckoutRequestBody({
      items: [{ product: { id: '42' }, quantity: '3' }],
    });
    assertEquals(parsed.items[0].product.id, 42);
    assertEquals(parsed.items[0].quantity, 3);
  }
);

Deno.test('parseCheckoutRequestBody: strips unknown top-level keys', () => {
  const parsed = parseCheckoutRequestBody({
    items: [{ product: { id: 1 }, quantity: 1 }],
    evil: 'x',
  } as Record<string, unknown>);
  assertEquals('evil' in parsed, false);
});

Deno.test(
  'parseCheckoutRequestBody: passthrough nested customer fields',
  () => {
    const parsed = parseCheckoutRequestBody({
      items: [{ product: { id: 1 }, quantity: 1 }],
      customerInfo: { firstName: 'A', futureField: 1 },
    } as Record<string, unknown>);
    assertEquals(
      (parsed.customerInfo as Record<string, unknown>).futureField,
      1
    );
  }
);

Deno.test('parseCheckoutRequestBody: rejects empty items', () => {
  assertThrows(
    () => parseCheckoutRequestBody({ items: [] }),
    Error,
    CHECKOUT_VALIDATION_ERROR_PREFIX
  );
});

Deno.test('parseCheckoutRequestBody: rejects more than MAX_CART_ITEMS', () => {
  const items = Array.from({ length: MAX_CART_ITEMS + 1 }, (_, i) => ({
    product: { id: i + 1 },
    quantity: 1,
  }));
  assertThrows(
    () => parseCheckoutRequestBody({ items }),
    Error,
    CHECKOUT_VALIDATION_ERROR_PREFIX
  );
});

Deno.test('parseCheckoutRequestBody: rejects zero quantity', () => {
  assertThrows(
    () =>
      parseCheckoutRequestBody({
        items: [{ product: { id: 1 }, quantity: 0 }],
      }),
    Error,
    CHECKOUT_VALIDATION_ERROR_PREFIX
  );
});

Deno.test('parseCheckoutRequestBody: rejects non-object body', () => {
  assertThrows(
    () => parseCheckoutRequestBody(null),
    Error,
    CHECKOUT_VALIDATION_ERROR_PREFIX
  );
});
