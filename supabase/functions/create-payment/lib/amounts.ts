// Pre-checkout estimate only: builds Stripe Checkout line_items from verified cart.
// Authoritative paid totals live in `orders.pricing_snapshot` + Stripe amounts, written by `stripe-webhook` on `checkout.session.completed`.
// Money path: VerifiedCartItem (euros) → subtotal cents → discount ratio → Stripe line_items (cents) + optional shipping.
import { SHIPPING_COST_CENTS, STRIPE_MINIMUM_CENTS } from '../constants.ts';
import type { CheckoutSessionLineItem, VerifiedCartItem } from '../types.ts';
import type { LogStep } from './log.ts';

export function subtotalFromVerifiedItems(verifiedItems: VerifiedCartItem[]): {
  subtotalEuros: number;
  subtotalCents: number;
} {
  const subtotalEuros: number = verifiedItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const subtotalCents: number = Math.round(subtotalEuros * 100);
  return { subtotalEuros, subtotalCents };
}

/** Caps discount so subtotal − discount + shipping estimate still meets Stripe minimum. */
export function capDiscountForStripeMinimum(params: {
  discountAmountCents: number;
  subtotalCents: number;
  subtotalEuros: number;
  hasFreeShipping: boolean;
  log: LogStep;
}): number {
  let { discountAmountCents } = params;
  const { subtotalCents, subtotalEuros, hasFreeShipping, log } = params;

  const shippingCentsEstimate: number =
    subtotalEuros > 0 && !hasFreeShipping ? SHIPPING_COST_CENTS : 0;
  const maxAllowedDiscount: number = Math.max(
    0,
    subtotalCents + shippingCentsEstimate - STRIPE_MINIMUM_CENTS
  );
  if (discountAmountCents > maxAllowedDiscount) {
    log('Capping discount to meet Stripe minimum', {
      original: discountAmountCents,
      capped: maxAllowedDiscount,
    });
    discountAmountCents = maxAllowedDiscount;
  }
  return discountAmountCents;
}

export function discountRatioFromCents(
  discountAmountCents: number,
  subtotalCents: number
): number {
  return discountAmountCents > 0 && subtotalCents > 0
    ? discountAmountCents / subtotalCents
    : 0;
}

/**
 * Stripe downloads `product_data.images` when creating Checkout — URLs must be
 * public HTTPS and reachable from Stripe (not localhost). Already-absolute
 * strings are left unchanged; Supabase Storage paths use the project URL.
 */
export function absoluteUrlForStripeProductImage(
  raw: string,
  storefrontPublicBaseUrl: string,
  supabaseProjectUrl: string | undefined
): string {
  const s = raw.trim();
  if (!s) return s;
  if (/^https?:\/\//i.test(s)) return s;
  const isStoragePath =
    s.startsWith('/storage/') ||
    s.startsWith('storage/') ||
    s.includes('/object/public/');
  const base = (
    isStoragePath && supabaseProjectUrl
      ? supabaseProjectUrl
      : storefrontPublicBaseUrl
  ).replace(/\/+$/, '');
  const path = s.startsWith('/') ? s : `/${s}`;
  return `${base}${path}`;
}

/** Stripe Checkout `product_data.images` accepts at most this many URLs per line item. */
const STRIPE_CHECKOUT_MAX_PRODUCT_IMAGES: number = 8;

function absoluteStripeImageUrlsForLineItem(params: {
  rawImages: string[];
  fallbackUrl: string | undefined;
  storefrontPublicBaseUrl: string;
  supabaseProjectUrl: string | undefined;
}): string[] {
  const {
    rawImages,
    fallbackUrl,
    storefrontPublicBaseUrl,
    supabaseProjectUrl,
  } = params;
  const seen: Set<string> = new Set<string>();
  const out: string[] = [];
  for (const raw of rawImages) {
    const t: string = raw.trim();
    if (!t) continue;
    const abs: string = absoluteUrlForStripeProductImage(
      t,
      storefrontPublicBaseUrl,
      supabaseProjectUrl
    );
    if (!abs || seen.has(abs)) continue;
    seen.add(abs);
    out.push(abs);
    if (out.length >= STRIPE_CHECKOUT_MAX_PRODUCT_IMAGES) return out;
  }
  if (out.length === 0 && fallbackUrl?.trim()) {
    const abs: string = absoluteUrlForStripeProductImage(
      fallbackUrl.trim(),
      storefrontPublicBaseUrl,
      supabaseProjectUrl
    );
    if (abs) out.push(abs);
  }
  return out;
}

/** Stripe Checkout line_items from verified cart + proportional discount spread. */
export function buildStripeCheckoutLineItems(params: {
  verifiedItems: VerifiedCartItem[];
  discountRatio: number;
  /** Public site origin for relative asset paths (e.g. rifelegance.com), not the browser Origin on localhost. */
  storefrontPublicBaseUrl: string;
  /** Same host as `SUPABASE_URL` — used for `/storage/...` product images. */
  supabaseProjectUrl: string | undefined;
  hasFreeShipping: boolean;
  subtotalEuros: number;
  /**
   * Optional `CHECKOUT_FALLBACK_PRODUCT_IMAGE_URL`: used when a line has no `product.images`
   * so Stripe Checkout still shows a valid HTTPS image.
   */
  stripeProductImageFallbackUrl?: string;
}): CheckoutSessionLineItem[] {
  const {
    verifiedItems,
    discountRatio,
    storefrontPublicBaseUrl,
    supabaseProjectUrl,
    hasFreeShipping,
    subtotalEuros,
    stripeProductImageFallbackUrl,
  } = params;

  const lineItems: CheckoutSessionLineItem[] = [];

  verifiedItems.forEach((item) => {
    const originalPriceCents: number = Math.round(item.product.price * 100);
    const discountedPriceCents: number =
      discountRatio > 0
        ? Math.max(1, Math.round(originalPriceCents * (1 - discountRatio)))
        : originalPriceCents;

    const images: string[] = absoluteStripeImageUrlsForLineItem({
      rawImages: item.product.images,
      fallbackUrl: stripeProductImageFallbackUrl,
      storefrontPublicBaseUrl,
      supabaseProjectUrl,
    });

    lineItems.push({
      price_data: {
        currency: 'eur',
        product_data: {
          name: item.product.name,
          description:
            discountRatio > 0
              ? `Prix original: ${(originalPriceCents / 100).toFixed(2)}€`
              : item.product.description || item.product.name,
          images,
        },
        unit_amount: discountedPriceCents,
      },
      quantity: item.quantity,
    });
  });

  if (subtotalEuros > 0 && !hasFreeShipping) {
    lineItems.push({
      price_data: {
        currency: 'eur',
        product_data: {
          name: 'Frais de livraison',
          description: 'Livraison standard',
        },
        unit_amount: SHIPPING_COST_CENTS,
      },
      quantity: 1,
    });
  }

  return lineItems;
}

export function sumCheckoutLineItemsCents(
  lineItems: CheckoutSessionLineItem[]
): number {
  return lineItems.reduce(
    (sum, item) => sum + item.price_data.unit_amount * item.quantity,
    0
  );
}
