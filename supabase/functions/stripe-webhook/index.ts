import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@18.5.0';
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import {
  confirmOrderFromStripe,
  orderItemsForConfirmationEmail,
  sendConfirmationEmail,
} from '../_shared/confirm-order.ts';
import {
  authoritativeTotalMajor,
  authoritativeTotalMinor,
} from '../_shared/order-money.ts';
import type { Database, Json } from '../_shared/database.types.ts';
import { jsonToRecord } from '../_shared/json-helpers.ts';

type WebhookSupabase = SupabaseClient<Database>;

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
    apiVersion: '2025-08-27.basil',
  });

  const supabaseService = createClient<Database>(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  // Explicit escape hatch for local integration testing only. MUST NOT be set
  // in production — the function is deployed with verify_jwt=false, so any
  // anonymous caller could otherwise mark an order as paid.
  const allowUnsigned =
    Deno.env.get('STRIPE_WEBHOOK_ALLOW_UNSIGNED')?.trim() === 'true';

  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    let event: Stripe.Event;

    if (webhookSecret && signature) {
      try {
        event = await stripe.webhooks.constructEventAsync(
          body,
          signature,
          webhookSecret
        );
        logStep('Webhook signature verified', { type: event.type });
      } catch (err) {
        logStep('Webhook signature verification failed', {
          error: (err as Error).message,
        });
        await logPaymentEvent(supabaseService, {
          event_type: 'webhook_signature_invalid',
          status: 'error',
          actor: 'stripe_webhook',
          error_message: `Invalid signature: ${(err as Error).message}`,
          details: { signature: signature?.slice(0, 20) + '...' },
        });
        return new Response('Invalid signature', { status: 400 });
      }
    } else if (allowUnsigned) {
      // Opt-in, dev-only path. Logged loudly and audited so prod misconfig is
      // visible in payment_events.
      event = JSON.parse(body) as Stripe.Event;
      logStep(
        'DEV-ONLY: Webhook accepted without signature (STRIPE_WEBHOOK_ALLOW_UNSIGNED=true)',
        { type: event.type }
      );
      await logPaymentEvent(supabaseService, {
        event_type: 'webhook_unsigned_accepted',
        status: 'warning',
        actor: 'stripe_webhook',
        error_message:
          'Processed without signature because STRIPE_WEBHOOK_ALLOW_UNSIGNED=true',
        details: { stripe_event_type: event.type },
      });
    } else {
      // Fail closed. Either STRIPE_WEBHOOK_SECRET is missing (deployment
      // misconfiguration) or the caller did not supply a stripe-signature
      // header. In either case we must NOT trust the body.
      logStep('Rejecting unsigned webhook request', {
        hasSecret: !!webhookSecret,
        hasSignature: !!signature,
      });
      await logPaymentEvent(supabaseService, {
        event_type: 'webhook_unsigned_rejected',
        status: 'error',
        actor: 'stripe_webhook',
        error_message: webhookSecret
          ? 'Missing stripe-signature header'
          : 'STRIPE_WEBHOOK_SECRET is not configured',
        details: { hasSecret: !!webhookSecret, hasSignature: !!signature },
      });
      return new Response(
        JSON.stringify({
          error: 'Webhook signature required',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    await logPaymentEvent(supabaseService, {
      event_type: 'stripe_webhook_received',
      status: 'info',
      actor: 'stripe_webhook',
      details: { stripe_event_id: event.id, stripe_event_type: event.type },
    });

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(supabaseService, stripe, session);
        break;
      }
      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutExpired(supabaseService, session);
        break;
      }
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(supabaseService, paymentIntent);
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailed(supabaseService, paymentIntent);
        break;
      }
      default:
        logStep('Unhandled event type', { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('ERROR in stripe-webhook', { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

// ============================================================
// Handle checkout.session.completed — AUTHORITATIVE confirmation
// Now delegates to shared confirmOrderFromStripe
// ============================================================
async function handleCheckoutCompleted(
  supabase: WebhookSupabase,
  stripe: Stripe,
  session: Stripe.Checkout.Session
) {
  const orderId = session.metadata?.order_id;
  const correlationId = session.metadata?.correlation_id;

  logStep('Processing checkout.session.completed', {
    sessionId: session.id,
    orderId,
    correlationId,
    paymentStatus: session.payment_status,
  });

  if (session.payment_status !== 'paid') {
    logStep('Session not paid, skipping', {
      paymentStatus: session.payment_status,
    });
    return;
  }

  if (!orderId) {
    logStep('ERROR: No order_id in session metadata');
    await logPaymentEvent(supabase, {
      event_type: 'webhook_missing_order_id',
      status: 'error',
      actor: 'stripe_webhook',
      correlation_id: correlationId,
      error_message: 'No order_id in Stripe session metadata',
      details: { session_id: session.id },
    });
    return;
  }

  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id;

  // ================================================================
  // CENTRALIZED: Single confirmation function
  // ================================================================
  const result = await confirmOrderFromStripe(supabase, {
    orderId,
    stripeSessionId: session.id,
    paymentIntentId,
    paymentMethod: session.payment_method_types?.[0] || 'card',
    correlationId,
    discountCode: session.metadata?.discount_code,
    source: 'stripe_webhook',
    customerEmail: session.customer_details?.email,
    customerName:
      session.customer_details?.name || session.metadata?.customer_name,
    stripe,
    session,
  });

  if (result.alreadyProcessed) {
    await logPaymentEvent(supabase, {
      order_id: orderId,
      event_type: 'webhook_idempotent_skip',
      status: 'info',
      actor: 'stripe_webhook',
      correlation_id: correlationId,
      details: { message: 'Already processed' },
    });
    return;
  }

  if (!result.confirmed) {
    await logPaymentEvent(supabase, {
      order_id: orderId,
      event_type: 'webhook_confirmation_failed',
      status: 'error',
      actor: 'stripe_webhook',
      correlation_id: correlationId,
      error_message: result.error,
    });
    return;
  }

  // ================================================================
  // SEND CONFIRMATION EMAIL (non-blocking)
  // ================================================================
  const customerEmail = session.customer_details?.email;
  if (customerEmail) {
    const { data: order } = await supabase
      .from('orders')
      .select(
        'order_items(id, product_id, quantity, unit_price), amount, total_amount, currency, shipping_address'
      )
      .eq('id', orderId)
      .single();

    if (order) {
      await sendConfirmationEmail(supabase, {
        orderId,
        customerEmail,
        customerName:
          session.customer_details?.name ||
          session.metadata?.customer_name ||
          'Client',
        orderItems: orderItemsForConfirmationEmail(order.order_items),
        orderAmount: authoritativeTotalMinor({
          total_amount: order.total_amount,
          amount: order.amount,
        }),
        currency: order.currency ?? 'eur',
        shippingAddress: order.shipping_address,
        discountAmountCents: session.metadata?.discount_amount_cents
          ? parseInt(session.metadata.discount_amount_cents)
          : undefined,
        source: 'stripe_webhook',
      });
    }
  }

  // ================================================================
  // FRAUD DETECTION (non-blocking)
  // ================================================================
  try {
    const { data: order } = await supabase
      .from('orders')
      .select(
        'user_id, amount, total_amount, shipping_address, billing_address'
      )
      .eq('id', orderId)
      .single();

    let isFirstOrder = true;
    if (order?.user_id) {
      const { count } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', order.user_id)
        .neq('id', orderId)
        .eq('status', 'paid');
      isFirstOrder = (count || 0) === 0;
    }

    await supabase.rpc('calculate_fraud_score', {
      p_order_id: orderId,
      p_customer_email: session.customer_details?.email || '',
      p_shipping_address: (order?.shipping_address ?? {}) as Json,
      p_billing_address: (order?.billing_address ?? {}) as Json,
      p_is_first_order: isFirstOrder,
      p_order_amount: authoritativeTotalMajor({
        total_amount: order?.total_amount ?? null,
        amount: order?.amount ?? null,
      }),
    });
    logStep('Fraud detection completed');
  } catch (fraudErr) {
    logStep('Fraud detection error (non-fatal)', {
      error: (fraudErr as Error).message,
    });
  }

  logStep('Webhook processing completed', { orderId, correlationId });
}

// ============================================================
// Handle payment_intent.succeeded — secondary confirmation
// ============================================================
async function handlePaymentIntentSucceeded(
  supabase: WebhookSupabase,
  paymentIntent: Stripe.PaymentIntent
) {
  const orderId = paymentIntent.metadata?.order_id;
  const correlationId = paymentIntent.metadata?.correlation_id;

  logStep('Processing payment_intent.succeeded', {
    paymentIntentId: paymentIntent.id,
    orderId,
  });

  if (!orderId) {
    logStep('No order_id in payment_intent metadata, skipping');
    return;
  }

  // Use the centralized function — it handles idempotency
  const result = await confirmOrderFromStripe(supabase, {
    orderId,
    stripeSessionId: '', // Not available from payment_intent
    paymentIntentId: paymentIntent.id,
    correlationId,
    source: 'stripe_webhook',
  });

  await logPaymentEvent(supabase, {
    order_id: orderId,
    event_type: 'payment_intent_succeeded',
    status: result.confirmed ? 'success' : 'info',
    actor: 'stripe_webhook',
    correlation_id: correlationId,
    details: {
      payment_intent_id: paymentIntent.id,
      was_update: result.confirmed && !result.alreadyProcessed,
    },
  });
}

// ============================================================
// Handle checkout.session.expired
// ============================================================
async function handleCheckoutExpired(
  supabase: WebhookSupabase,
  session: Stripe.Checkout.Session
) {
  const orderId = session.metadata?.order_id;
  const correlationId = session.metadata?.correlation_id;

  logStep('Processing checkout.session.expired', {
    sessionId: session.id,
    orderId,
  });

  if (orderId) {
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('metadata')
      .eq('id', orderId)
      .single();

    const { data: updated } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        order_status: 'cancelled',
        metadata: {
          ...jsonToRecord(existingOrder?.metadata),
          cancelled_reason: 'stripe_session_expired',
          cancelled_at: new Date().toISOString(),
          correlation_id: correlationId,
        } as Json,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle();

    if (updated) {
      await supabase.from('order_status_history').insert({
        order_id: orderId,
        previous_status: 'payment_pending',
        new_status: 'cancelled',
        changed_by: 'webhook',
        reason_code: 'SESSION_EXPIRED',
        reason_message: 'Stripe checkout session expired',
      });
      logStep('Order cancelled due to expired session', { orderId });
    }
  }

  await logPaymentEvent(supabase, {
    order_id: orderId,
    event_type: 'checkout_expired',
    status: 'warning',
    actor: 'stripe_webhook',
    correlation_id: correlationId,
    details: { session_id: session.id },
  });
}

// ============================================================
// Handle payment_intent.payment_failed
// ============================================================
async function handlePaymentFailed(
  supabase: WebhookSupabase,
  paymentIntent: Stripe.PaymentIntent
) {
  const orderId = paymentIntent.metadata?.order_id;
  const correlationId = paymentIntent.metadata?.correlation_id;

  logStep('Processing payment_intent.payment_failed', { orderId });

  if (orderId) {
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('metadata')
      .eq('id', orderId)
      .single();

    await supabase
      .from('orders')
      .update({
        status: 'payment_failed',
        order_status: 'payment_failed',
        metadata: {
          ...jsonToRecord(existingOrder?.metadata),
          payment_failed_at: new Date().toISOString(),
          failure_message:
            paymentIntent.last_payment_error?.message || 'Unknown',
          failure_code: paymentIntent.last_payment_error?.code || 'unknown',
          correlation_id: correlationId,
        } as Json,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .eq('status', 'pending');

    await supabase.from('order_status_history').insert({
      order_id: orderId,
      previous_status: 'payment_pending',
      new_status: 'payment_failed',
      changed_by: 'webhook',
      reason_code: 'PAYMENT_FAILED',
      reason_message:
        paymentIntent.last_payment_error?.message || 'Payment failed',
    });
  }

  await logPaymentEvent(supabase, {
    order_id: orderId,
    event_type: 'payment_failed',
    status: 'error',
    actor: 'stripe_webhook',
    correlation_id: correlationId,
    error_message:
      paymentIntent.last_payment_error?.message || 'Payment failed',
    details: {
      failure_code: paymentIntent.last_payment_error?.code,
      payment_intent_id: paymentIntent.id,
    },
  });
}

// ============================================================
// Helper: Log payment event
// ============================================================
async function logPaymentEvent(
  supabase: WebhookSupabase,
  event: {
    order_id?: string;
    event_type: string;
    status: string;
    actor: string;
    correlation_id?: string;
    error_message?: string;
    details?: Json;
    ip_address?: string;
    user_agent?: string;
    duration_ms?: number;
  }
) {
  try {
    await supabase.from('payment_events').insert({
      order_id: event.order_id || null,
      correlation_id: event.correlation_id || null,
      event_type: event.event_type,
      status: event.status,
      actor: event.actor,
      details: (event.details ?? {}) as Json,
      error_message: event.error_message || null,
      ip_address: event.ip_address || null,
      user_agent: event.user_agent || null,
      duration_ms: event.duration_ms || null,
    });
  } catch (err) {
    console.error('[STRIPE-WEBHOOK] Failed to log payment event:', err);
  }
}
