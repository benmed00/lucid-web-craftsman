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

/** Stripe Checkout line_items from verified cart + proportional discount spread. */
export function buildStripeCheckoutLineItems(params: {
  verifiedItems: VerifiedCartItem[];
  discountRatio: number;
  imageOriginPrefix: string;
  hasFreeShipping: boolean;
  subtotalEuros: number;
}): CheckoutSessionLineItem[] {
  const {
    verifiedItems,
    discountRatio,
    imageOriginPrefix,
    hasFreeShipping,
    subtotalEuros,
  } = params;

  const lineItems: CheckoutSessionLineItem[] = [];

  verifiedItems.forEach((item) => {
    const originalPriceCents: number = Math.round(item.product.price * 100);
    const discountedPriceCents: number =
      discountRatio > 0
        ? Math.max(1, Math.round(originalPriceCents * (1 - discountRatio)))
        : originalPriceCents;

    lineItems.push({
      price_data: {
        currency: 'eur',
        product_data: {
          name: item.product.name,
          description:
            discountRatio > 0
              ? `Prix original: ${(originalPriceCents / 100).toFixed(2)}€`
              : item.product.description || item.product.name,
          images:
            item.product.images.length > 0
              ? [item.product.images[0].startsWith('http') 
                  ? item.product.images[0] 
                  : `${imageOriginPrefix}${item.product.images[0]}`]
              : [],
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
