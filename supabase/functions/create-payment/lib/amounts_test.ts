import { assertEquals } from '@std/assert';

import { SHIPPING_COST_CENTS, STRIPE_MINIMUM_CENTS } from '../constants.ts';
import type { VerifiedCartItem } from '../types.ts';
import {
  absoluteUrlForStripeProductImage,
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

Deno.test(
  'capDiscountForStripeMinimum: caps when discount would break Stripe min',
  () => {
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
  }
);

Deno.test(
  'capDiscountForStripeMinimum: caps with shipping estimate when not free shipping',
  () => {
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
  }
);

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

Deno.test('absoluteUrlForStripeProductImage: keeps absolute URLs', () => {
  assertEquals(
    absoluteUrlForStripeProductImage(
      'https://cdn.example/img.png',
      'https://shop.com',
      'https://proj.supabase.co'
    ),
    'https://cdn.example/img.png'
  );
});

Deno.test(
  'absoluteUrlForStripeProductImage: Supabase storage path uses project URL',
  () => {
    assertEquals(
      absoluteUrlForStripeProductImage(
        '/storage/v1/object/public/hero-images/x.jpg',
        'https://shop.com',
        'https://proj.supabase.co'
      ),
      'https://proj.supabase.co/storage/v1/object/public/hero-images/x.jpg'
    );
  }
);

Deno.test(
  'absoluteUrlForStripeProductImage: site-relative path uses storefront',
  () => {
    assertEquals(
      absoluteUrlForStripeProductImage(
        '/assets/p.jpg',
        'https://shop.com',
        'https://proj.supabase.co'
      ),
      'https://shop.com/assets/p.jpg'
    );
  }
);

Deno.test(
  'buildStripeCheckoutLineItems: discount ratio + shipping line',
  () => {
    const verifiedItems = [sampleItem(10, 1)];
    const lines = buildStripeCheckoutLineItems({
      verifiedItems,
      discountRatio: 0.1,
      storefrontPublicBaseUrl: 'https://example.com',
      supabaseProjectUrl: undefined,
      hasFreeShipping: false,
      subtotalEuros: 10,
    });
    assertEquals(lines.length, 2);
    assertEquals(lines[0].price_data.unit_amount, 900);
    assertEquals(lines[1].price_data.product_data.name, 'Frais de livraison');
    assertEquals(lines[1].price_data.unit_amount, SHIPPING_COST_CENTS);
  }
);

Deno.test(
  'buildStripeCheckoutLineItems: free shipping omits shipping line',
  () => {
    const lines = buildStripeCheckoutLineItems({
      verifiedItems: [sampleItem(10, 1)],
      discountRatio: 0,
      storefrontPublicBaseUrl: 'https://x',
      supabaseProjectUrl: undefined,
      hasFreeShipping: true,
      subtotalEuros: 10,
    });
    assertEquals(lines.length, 1);
  }
);

Deno.test(
  'buildStripeCheckoutLineItems: multiple product images for Stripe Checkout',
  () => {
    const lines = buildStripeCheckoutLineItems({
      verifiedItems: [
        {
          product: {
            id: 3,
            name: 'Multi',
            price: 3,
            description: 'd',
            images: ['/a.png', '/b.png'],
          },
          quantity: 1,
        },
      ],
      discountRatio: 0,
      storefrontPublicBaseUrl: 'https://shop.example',
      supabaseProjectUrl: undefined,
      hasFreeShipping: true,
      subtotalEuros: 3,
    });
    assertEquals(lines[0].price_data.product_data.images, [
      'https://shop.example/a.png',
      'https://shop.example/b.png',
    ]);
  }
);

Deno.test('buildStripeCheckoutLineItems: dedupes identical image URLs', () => {
  const lines = buildStripeCheckoutLineItems({
    verifiedItems: [
      {
        product: {
          id: 4,
          name: 'Dup',
          price: 1,
          description: 'd',
          images: ['/x.jpg', '/x.jpg', '  /x.jpg  '],
        },
        quantity: 1,
      },
    ],
    discountRatio: 0,
    storefrontPublicBaseUrl: 'https://shop.example',
    supabaseProjectUrl: undefined,
    hasFreeShipping: true,
    subtotalEuros: 1,
  });
  assertEquals(lines[0].price_data.product_data.images, [
    'https://shop.example/x.jpg',
  ]);
});

Deno.test(
  'buildStripeCheckoutLineItems: caps images at Stripe Checkout limit (8)',
  () => {
    const many: string[] = Array.from({ length: 12 }, (_, i) => `/p${i}.png`);
    const lines = buildStripeCheckoutLineItems({
      verifiedItems: [
        {
          product: {
            id: 5,
            name: 'Many',
            price: 1,
            description: 'd',
            images: many,
          },
          quantity: 1,
        },
      ],
      discountRatio: 0,
      storefrontPublicBaseUrl: 'https://shop.example',
      supabaseProjectUrl: undefined,
      hasFreeShipping: true,
      subtotalEuros: 1,
    });
    const imgs: string[] = lines[0].price_data.product_data.images ?? [];
    assertEquals(imgs.length, 8);
    assertEquals(imgs[0], 'https://shop.example/p0.png');
    assertEquals(imgs[7], 'https://shop.example/p7.png');
  }
);

Deno.test(
  'buildStripeCheckoutLineItems: fallback image when product has no images',
  () => {
    const lines = buildStripeCheckoutLineItems({
      verifiedItems: [
        {
          product: {
            id: 2,
            name: 'NoImg',
            price: 5,
            description: 'x',
            images: [],
          },
          quantity: 1,
        },
      ],
      discountRatio: 0,
      storefrontPublicBaseUrl: 'https://shop.example',
      supabaseProjectUrl: undefined,
      hasFreeShipping: true,
      subtotalEuros: 5,
      stripeProductImageFallbackUrl: 'https://cdn.example/placeholder.png',
    });
    assertEquals(lines.length, 1);
    assertEquals(lines[0].price_data.product_data.images, [
      'https://cdn.example/placeholder.png',
    ]);
  }
);

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
