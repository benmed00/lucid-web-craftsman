import { assertEquals } from '@std/assert';

import { SHIPPING_COST_CENTS, STRIPE_MINIMUM_CENTS } from '../constants.ts';
import type { VerifiedCartItem } from '../types.ts';
import {
  buildStripeCheckoutLineItems,
  capDiscountForStripeMinimum,
  discountRatioFromCents,
  subtotalFromVerifiedItems,
  sumCheckoutLineItemsCents,
} from './amounts.ts';
import type { LogStep } from './log.ts';

const noopLog: LogStep = () => {};

const sampleItem = (price: number, qty: number): VerifiedCartItem => ({
  product: {
    id: 1,
    name: 'P',
    price,
    description: 'd',
    images: ['/img.png'],
  },
  quantity: qty,
});

Deno.test('subtotalFromVerifiedItems', () => {
  const { subtotalEuros, subtotalCents } = subtotalFromVerifiedItems([
    sampleItem(10, 2),
    sampleItem(5, 1),
  ]);
  assertEquals(subtotalEuros, 25);
  assertEquals(subtotalCents, 2500);
});

Deno.test('discountRatioFromCents', () => {
  assertEquals(discountRatioFromCents(0, 100), 0);
  assertEquals(discountRatioFromCents(250, 1000), 0.25);
});

Deno.test('capDiscountForStripeMinimum: caps when discount would break Stripe min', () => {
  const subtotalCents = 100;
  const subtotalEuros = 1;
  const capped = capDiscountForStripeMinimum({
    discountAmountCents: 100,
    subtotalCents,
    subtotalEuros,
    hasFreeShipping: true,
    log: noopLog,
  });
  const maxAllowed = Math.max(0, subtotalCents - STRIPE_MINIMUM_CENTS);
  assertEquals(capped, maxAllowed);
});

Deno.test('capDiscountForStripeMinimum: caps with shipping estimate when not free shipping', () => {
  const subtotalCents = 100;
  const maxAllowed =
    subtotalCents + SHIPPING_COST_CENTS - STRIPE_MINIMUM_CENTS;
  const capped = capDiscountForStripeMinimum({
    discountAmountCents: 9_999,
    subtotalCents,
    subtotalEuros: 1,
    hasFreeShipping: false,
    log: noopLog,
  });
  assertEquals(capped, maxAllowed);
});

Deno.test('capDiscountForStripeMinimum: no cap when within limit', () => {
  const capped = capDiscountForStripeMinimum({
    discountAmountCents: 10,
    subtotalCents: 2000,
    subtotalEuros: 20,
    hasFreeShipping: true,
    log: noopLog,
  });
  assertEquals(capped, 10);
});

Deno.test('buildStripeCheckoutLineItems: discount ratio + shipping line', () => {
  const verifiedItems = [sampleItem(10, 1)];
  const lines = buildStripeCheckoutLineItems({
    verifiedItems,
    discountRatio: 0.1,
    imageOriginPrefix: 'https://example.com',
    hasFreeShipping: false,
    subtotalEuros: 10,
  });
  assertEquals(lines.length, 2);
  assertEquals(lines[0].price_data.unit_amount, 900);
  assertEquals(lines[1].price_data.product_data.name, 'Frais de livraison');
  assertEquals(lines[1].price_data.unit_amount, SHIPPING_COST_CENTS);
});

Deno.test('buildStripeCheckoutLineItems: free shipping omits shipping line', () => {
  const lines = buildStripeCheckoutLineItems({
    verifiedItems: [sampleItem(10, 1)],
    discountRatio: 0,
    imageOriginPrefix: 'https://x',
    hasFreeShipping: true,
    subtotalEuros: 10,
  });
  assertEquals(lines.length, 1);
});

Deno.test('sumCheckoutLineItemsCents', () => {
  const sum = sumCheckoutLineItemsCents([
    {
      price_data: {
        currency: 'eur',
        product_data: { name: 'a', description: '' },
        unit_amount: 100,
      },
      quantity: 2,
    },
  ]);
  assertEquals(sum, 200);
});
