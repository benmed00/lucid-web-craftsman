import { assertEquals, assertThrows } from '@std/assert';

import type { CheckoutCartItem, DbProductRow } from '../types.ts';
import {
  buildVerifiedCartItems,
  collectProductIds,
} from './verified-cart.ts';
import type { LogStep } from './log.ts';

const noopLog: LogStep = () => {};

Deno.test('collectProductIds: filters non-finite', () => {
  const items: CheckoutCartItem[] = [
    { product: { id: 1 }, quantity: 1 },
    { product: { id: 2 }, quantity: 1 },
  ];
  assertEquals(collectProductIds(items), [1, 2]);
});

Deno.test('buildVerifiedCartItems: maps DB row to VerifiedCartItem', () => {
  const cart: CheckoutCartItem[] = [{ product: { id: 10, price: 9.99 }, quantity: 2 }];
  const rows: DbProductRow[] = [
    {
      id: 10,
      name: 'N',
      price: 10,
      stock_quantity: 5,
      is_active: true,
      is_available: true,
      images: ['a.jpg'],
      description: 'desc',
    },
  ];
  const verified = buildVerifiedCartItems(cart, rows, noopLog);
  assertEquals(verified.length, 1);
  assertEquals(verified[0].product.price, 10);
  assertEquals(verified[0].product.name, 'N');
  assertEquals(verified[0].quantity, 2);
});

Deno.test('buildVerifiedCartItems: throws introuvable', () => {
  assertThrows(
    () =>
      buildVerifiedCartItems(
        [{ product: { id: 99 }, quantity: 1 }],
        [],
        noopLog
      ),
    Error,
    'introuvable'
  );
});

Deno.test('buildVerifiedCartItems: throws indisponible when inactive', () => {
  const rows: DbProductRow[] = [
    {
      id: 1,
      name: 'X',
      price: 1,
      stock_quantity: 10,
      is_active: false,
      is_available: true,
      images: [],
      description: null,
    },
  ];
  assertThrows(
    () =>
      buildVerifiedCartItems(
        [{ product: { id: 1 }, quantity: 1 }],
        rows,
        noopLog
      ),
    Error,
    'indisponible'
  );
});

Deno.test('buildVerifiedCartItems: throws insuffisant stock', () => {
  const rows: DbProductRow[] = [
    {
      id: 1,
      name: 'X',
      price: 1,
      stock_quantity: 1,
      is_active: true,
      is_available: true,
      images: [],
      description: null,
    },
  ];
  assertThrows(
    () =>
      buildVerifiedCartItems(
        [{ product: { id: 1 }, quantity: 3 }],
        rows,
        noopLog
      ),
    Error,
    'insuffisant'
  );
});
