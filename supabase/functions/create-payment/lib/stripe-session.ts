import Stripe from 'stripe';

import type {
  CheckoutRequestBody,
  CheckoutSessionLineItem,
  GuestMetadata,
  PrefillStripeAddress,
  ShippingAddressPayload,
} from '../types.ts';

export type BuildCheckoutSessionParamsInput = {
  customerId: string | undefined;
  customerInfo: CheckoutRequestBody['customerInfo'];
  lineItems: CheckoutSessionLineItem[];
  /** Canonical site origin for success/cancel URLs (no trailing slash) */
  siteBaseUrl: string;
  shippingAddress: ShippingAddressPayload | null;
  verifiedDiscountCode: string | null;
  discountAmountCents: number;
  hasFreeShipping: boolean;
  orderId: string;
  correlationId: string;
  guestMetadata: GuestMetadata | null;
};

/** Maps DB/checkout shipping payload → Stripe `payment_intent_data.shipping.address` shape. */
export function prefillStripeAddressFromShipping(
  shippingAddress: ShippingAddressPayload
): PrefillStripeAddress {
  return {
    line1: shippingAddress.address_line1 || '',
    line2: shippingAddress.address_line2 || '',
    city: shippingAddress.city || '',
    postal_code: shippingAddress.postal_code || '',
    country: shippingAddress.country || 'FR',
  };
}

/** Builds Stripe Checkout `SessionCreateParams` for this shop’s payment flow. */
export function buildCheckoutSessionCreateParams(
  input: BuildCheckoutSessionParamsInput
): Stripe.Checkout.SessionCreateParams {
  const {
    customerId,
    customerInfo,
    lineItems,
    siteBaseUrl,
    shippingAddress,
    verifiedDiscountCode,
    discountAmountCents,
    hasFreeShipping,
    orderId,
    correlationId,
    guestMetadata,
  } = input;

  const prefillShippingAddress: PrefillStripeAddress | undefined =
    shippingAddress
      ? prefillStripeAddressFromShipping(shippingAddress)
      : undefined;

  return {
    customer: customerId,
    customer_email: customerId ? undefined : customerInfo?.email,
    customer_creation: customerId ? undefined : 'always',
    line_items: lineItems,
    mode: 'payment',
    payment_method_types: ['card'],
    success_url: `${siteBaseUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteBaseUrl}/checkout`,
    shipping_address_collection: shippingAddress
      ? undefined
      : {
          allowed_countries: ['FR', 'BE', 'CH', 'MC', 'LU'],
        },
    billing_address_collection: 'auto',
    phone_number_collection: { enabled: false },
    locale: 'fr',
    custom_text: {
      ...(verifiedDiscountCode
        ? {
            submit: {
              message: `Code promo ${verifiedDiscountCode} appliqué (-${(discountAmountCents / 100).toFixed(2)}€)${hasFreeShipping ? ' + Livraison offerte' : ''}`,
            },
          }
        : {}),
      ...(shippingAddress
        ? {}
        : {
            shipping_address: {
              message: 'Veuillez entrer votre adresse de livraison',
            },
          }),
    },
    invoice_creation: {
      enabled: true,
      invoice_data: {
        description: `Commande Rif Raw Straw${verifiedDiscountCode ? ` - Code: ${verifiedDiscountCode}` : ''}`,
        metadata: { order_id: orderId, correlation_id: correlationId },
        custom_fields: verifiedDiscountCode
          ? [{ name: 'Code promo', value: verifiedDiscountCode }]
          : undefined,
        footer:
          'Merci pour votre commande ! Rif Raw Straw - Artisanat berbère authentique',
      },
    },
    metadata: {
      order_id: orderId,
      correlation_id: correlationId,
      guest_id: guestMetadata?.guest_id || '',
      customer_name: customerInfo
        ? `${customerInfo.firstName} ${customerInfo.lastName}`
        : 'Guest',
      customer_phone: customerInfo?.phone || '',
      discount_code: verifiedDiscountCode || '',
      discount_amount_cents: String(discountAmountCents),
      free_shipping: hasFreeShipping ? 'true' : 'false',
    },
    payment_intent_data: {
      description: `Commande Rif Raw Straw #${orderId.substring(0, 8).toUpperCase()}`,
      metadata: {
        order_id: orderId,
        correlation_id: correlationId,
        discount_code: verifiedDiscountCode || '',
      },
      shipping:
        shippingAddress && prefillShippingAddress
          ? {
              name: `${shippingAddress.first_name} ${shippingAddress.last_name}`,
              phone: shippingAddress.phone || '',
              address: prefillShippingAddress,
            }
          : undefined,
    },
    consent_collection: { terms_of_service: 'required' },
  };
}
