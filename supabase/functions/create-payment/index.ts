import { serve } from '@std/http/server';
import Stripe from 'stripe';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import {
  corsHeaders,
  getValidOrigin,
  RATE_LIMIT_WINDOW_MS,
} from './constants.ts';
import {
  buildStripeCheckoutLineItems,
  capDiscountForStripeMinimum,
  discountRatioFromCents,
  subtotalFromVerifiedItems,
  sumCheckoutLineItemsCents,
} from './lib/amounts.ts';
import { resolveOptionalUserFromAuthHeader } from './lib/auth-user.ts';
import { parseCheckoutRequestBody } from './lib/checkout-schema.ts';
import { resolveServerDiscount } from './lib/discount.ts';
import {
  errorConstructorLabel,
  isClientFacingValidationError,
  messageFromUnknownError,
} from './lib/errors.ts';
import { checkRateLimit, type RateLimitResult } from './lib/rate-limit.ts';
import {
  isValidEmail,
  sanitizeString,
  verifyCsrfToken,
} from './lib/security.ts';
import {
  buildShippingAddressPayload,
  fetchVipThresholdCents,
  insertOrderLineItems,
  insertPaymentPendingOrder,
  invokeVipOrderNotificationIfNeeded,
  mapVerifiedItemsToOrderInserts,
} from './lib/orders.ts';
import { createPaymentEventLogger } from './lib/payment-events.ts';
import { createCheckoutStripeClient } from './lib/stripe-client.ts';
import { lookupStripeCustomerIdByEmail } from './lib/stripe-customer.ts';
import { buildCheckoutSessionCreateParams } from './lib/stripe-session.ts';
import {
  buildVerifiedCartItems,
  collectProductIds,
  fetchProductsForCart,
} from './lib/verified-cart.ts';
import type {
  GuestMetadata,
  OrderInsertMetadata,
  OrderRow,
  ShippingAddressPayload,
  VerifiedCartItem,
} from './types.ts';

/**
 * Orchestrates checkout: validate body → verify cart against DB → discounts → Stripe line items
 * → order + line items → Stripe Checkout Session. See `DATA_FLOW.md` for shapes and mappings.
 */
const logStep: (step: string, details?: unknown) => void = (step, details) => {
  const detailsStr: string = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient: SupabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  );

  const supabaseService: SupabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  const logPaymentEvent = createPaymentEventLogger(supabaseService);

  const startTime: number = Date.now();

  try {
    logStep('Function started');

    const rawIP: string =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('cf-connecting-ip') ||
      'unknown';
    const clientIP: string =
      rawIP !== 'unknown' ? rawIP.replace(/\.\d+$/, '.xxx') : 'unknown';
    const clientCountry: string | null =
      req.headers.get('cf-ipcountry') || null;

    // Rate limit
    const rateLimitResult: RateLimitResult = checkRateLimit(clientIP);
    if (!rateLimitResult.allowed) {
      logStep('Rate limit exceeded', { clientIP });
      return new Response(
        JSON.stringify({
          error:
            'Trop de tentatives de paiement. Veuillez réessayer dans 5 minutes.',
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)),
          },
          status: 429,
        }
      );
    }

    // CSRF verification
    const csrfToken: string | null = req.headers.get('x-csrf-token');
    const csrfNonce: string | null = req.headers.get('x-csrf-nonce');
    const csrfHash: string | null = req.headers.get('x-csrf-hash');
    if (!csrfToken || !csrfNonce || !csrfHash) {
      logStep('CSRF headers missing - rejecting request');
      return new Response(
        JSON.stringify({
          error: 'CSRF token required. Please refresh the page and try again.',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      );
    }
    const csrfValid: boolean = await verifyCsrfToken(
      csrfToken,
      csrfNonce,
      csrfHash
    );
    if (!csrfValid) {
      logStep('CSRF verification failed');
      return new Response(
        JSON.stringify({
          error: 'Requête invalide. Veuillez rafraîchir la page et réessayer.',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      );
    }
    logStep('CSRF verification passed');

    const checkoutPayload = parseCheckoutRequestBody(await req.json());
    const {
      items: cartItems,
      customerInfo,
      discount,
      guestSession,
      paymentMethod,
    } = checkoutPayload;

    // ========================================================================
    // 🔒 COD BACKEND VALIDATION — NEVER trust frontend eligibility
    // ========================================================================
    if (paymentMethod === 'cod') {
      const postalCode = customerInfo?.postalCode?.trim() ?? '';
      if (!/^44\d{3}$/.test(postalCode)) {
        logStep('COD rejected — ineligible postal code', { postalCode });
        return new Response(
          JSON.stringify({
            error: 'Le paiement à la livraison n\'est disponible que pour la Loire-Atlantique (44).',
            error_type: 'validation',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 422,
          }
        );
      }
    }

    const guestMetadata: GuestMetadata | null = guestSession
      ? {
          guest_id: sanitizeString(guestSession.guest_id),
          device_type: sanitizeString(guestSession.device_type),
          os: sanitizeString(guestSession.os),
          browser: sanitizeString(guestSession.browser),
        }
      : null;

    if (customerInfo?.email && !isValidEmail(customerInfo.email)) {
      throw new Error('Invalid email format');
    }

    logStep('Received order data', {
      itemCount: cartItems.length,
      hasDiscount: !!discount,
    });

    // ========================================================================
    // 🔒 SERVER-SIDE PRICE VERIFICATION — NEVER trust client prices
    // ========================================================================
    const productIds: number[] = collectProductIds(cartItems);
    if (productIds.length === 0) {
      throw new Error('Invalid product IDs');
    }

    const dbProductRows = await fetchProductsForCart(
      supabaseService,
      productIds,
      logStep
    );

    const verifiedItems: VerifiedCartItem[] = buildVerifiedCartItems(
      cartItems,
      dbProductRows,
      logStep
    );

    logStep('Server-side price verification passed', {
      itemCount: verifiedItems.length,
    });

    // ========================================================================
    // DISCOUNT VERIFICATION — server-side coupon validation
    // ========================================================================
    let { discountAmountCents, hasFreeShipping, verifiedDiscountCode } =
      await resolveServerDiscount(
        supabaseService,
        verifiedItems,
        discount,
        logStep
      );

    // ========================================================================
    // AMOUNT CALCULATION (all amounts in CENTS for Stripe)
    // ========================================================================
    const { subtotalEuros, subtotalCents } =
      subtotalFromVerifiedItems(verifiedItems);

    discountAmountCents = capDiscountForStripeMinimum({
      discountAmountCents,
      subtotalCents,
      subtotalEuros,
      hasFreeShipping,
      log: logStep,
    });

    const discountRatio: number = discountRatioFromCents(
      discountAmountCents,
      subtotalCents
    );

    logStep('Amount calculation', {
      subtotalCents,
      discountAmountCents,
      discountRatio: (discountRatio * 100).toFixed(2) + '%',
    });

    const lineItems = buildStripeCheckoutLineItems({
      verifiedItems,
      discountRatio,
      imageOriginPrefix: getValidOrigin(req),
      hasFreeShipping,
      subtotalEuros,
    });

    // ========================================================================
    // TOTAL in CENTS (stored in DB as cents for consistency)
    // ========================================================================
    const totalAmountCents: number = sumCheckoutLineItemsCents(lineItems);

    logStep('Total calculated', {
      totalAmountCents,
      lineItemCount: lineItems.length,
    });

    const stripe: Stripe = createCheckoutStripeClient();

    const customerId: string | undefined =
      customerInfo?.email != null && customerInfo.email !== ''
        ? await lookupStripeCustomerIdByEmail(stripe, customerInfo.email)
        : undefined;

    const user = await resolveOptionalUserFromAuthHeader(
      supabaseClient,
      req.headers.get('Authorization'),
      logStep
    );

    const vipThresholdCents: number =
      await fetchVipThresholdCents(supabaseService);
    const isVipOrder: boolean = totalAmountCents >= vipThresholdCents;

    const shippingAddress: ShippingAddressPayload | null =
      buildShippingAddressPayload(customerInfo);

    // Generate correlation ID for end-to-end traceability
    const correlationId: string = crypto.randomUUID();

    const orderMetadata: OrderInsertMetadata = {
      correlation_id: correlationId,
      guest_id: guestMetadata?.guest_id || null,
      device_type: guestMetadata?.device_type || null,
      os: guestMetadata?.os || null,
      browser: guestMetadata?.browser || null,
      client_ip: clientIP,
      client_country: clientCountry,
      discount_code: verifiedDiscountCode,
      discount_amount_cents: discountAmountCents,
      is_vip_order: isVipOrder,
      verified_subtotal_cents: subtotalCents,
    };

    // ========================================================================
    // CREATE ORDER — both `status` and `order_status` set to 'pending'
    // Amount stored in CENTS for consistency with Stripe
    // ========================================================================
    const orderData: OrderRow = await insertPaymentPendingOrder(
      supabaseService,
      {
        userId: user?.id || null,
        totalAmountCents,
        shippingAddress,
        metadata: orderMetadata,
      },
      logStep
    );

    logStep('Order created', {
      orderId: orderData.id,
      correlationId,
      isVipOrder,
      totalAmountCents,
    });

    const orderItems = mapVerifiedItemsToOrderInserts(
      orderData.id,
      verifiedItems
    );
    await insertOrderLineItems(supabaseService, orderItems, logStep);

    await invokeVipOrderNotificationIfNeeded(supabaseService, {
      isVipOrder,
      customerInfo,
      orderId: orderData.id,
      totalAmountCents,
      vipThresholdCents,
      log: logStep,
    });

    // ========================================================================
    // CREATE STRIPE CHECKOUT SESSION
    // ========================================================================
    const siteBaseUrl: string = getValidOrigin(req);
    const sessionParams: Stripe.Checkout.SessionCreateParams =
      buildCheckoutSessionCreateParams({
        customerId,
        customerInfo,
        lineItems,
        siteBaseUrl,
        shippingAddress,
        verifiedDiscountCode,
        discountAmountCents,
        hasFreeShipping,
        orderId: orderData.id,
        correlationId,
        guestMetadata,
      });

    logStep('Creating Stripe session', {
      hasShippingPrefill: !!shippingAddress,
      hasDiscount: !!verifiedDiscountCode,
      correlationId,
    });

    const session: Stripe.Checkout.Session =
      await stripe.checkout.sessions.create(sessionParams);
    logStep('Stripe session created', { sessionId: session.id });

    // Update order with Stripe session ID and link to checkout session
    const checkoutSessionId: string | null =
      req.headers.get('x-checkout-session-id') || null;
    await supabaseService
      .from('orders')
      .update({
        stripe_session_id: session.id,
        ...(checkoutSessionId
          ? { checkout_session_id: checkoutSessionId }
          : {}),
      })
      .eq('id', orderData.id);

    // Log payment event
    await logPaymentEvent({
      order_id: orderData.id,
      event_type: 'stripe_session_created',
      status: 'success',
      actor: 'edge_function',
      correlation_id: correlationId,
      ip_address: clientIP,
      duration_ms: Date.now() - startTime,
      details: {
        stripe_session_id: session.id,
        item_count: verifiedItems.length,
        subtotal_cents: subtotalCents,
        total_cents: totalAmountCents,
        discount_cents: discountAmountCents,
        discount_code: verifiedDiscountCode || null,
        is_vip: isVipOrder,
        has_user: !!user?.id,
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('Payment creation error:', err);

    const message: string = messageFromUnknownError(error);
    const errorType: string = errorConstructorLabel(error);

    await logPaymentEvent({
      event_type: 'payment_initiation_failed',
      status: 'error',
      actor: 'edge_function',
      error_message: message,
      duration_ms: Date.now() - startTime,
      details: { error_type: errorType },
    });

    const isValidationError: boolean = isClientFacingValidationError(message);

    return new Response(
      JSON.stringify({
        error: message,
        error_type: isValidationError ? 'validation' : 'internal',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: isValidationError ? 422 : 500,
      }
    );
  }
});
