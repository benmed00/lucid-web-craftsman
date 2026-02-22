import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@18.5.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Webhooks are POST only
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
    apiVersion: '2025-08-27.basil',
  });

  const supabaseService = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    let event: Stripe.Event;

    // Verify webhook signature if secret is configured
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
        // Log security event
        await logPaymentEvent(supabaseService, {
          event_type: 'webhook_signature_invalid',
          status: 'error',
          actor: 'stripe_webhook',
          error_message: `Invalid signature: ${(err as Error).message}`,
          details: { signature: signature?.slice(0, 20) + '...' },
        });
        return new Response('Invalid signature', { status: 400 });
      }
    } else {
      // Parse without verification (dev mode)
      event = JSON.parse(body) as Stripe.Event;
      logStep('WARNING: Webhook received without signature verification', {
        type: event.type,
      });
    }

    // Log webhook receipt
    await logPaymentEvent(supabaseService, {
      event_type: 'stripe_webhook_received',
      status: 'info',
      actor: 'stripe_webhook',
      details: {
        stripe_event_id: event.id,
        stripe_event_type: event.type,
      },
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
// Handle checkout.session.completed
// This is the AUTHORITATIVE payment confirmation (not the client redirect)
// ============================================================
async function handleCheckoutCompleted(
  supabase: ReturnType<typeof createClient>,
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

  // Fetch order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(
      '*, order_items (id, product_id, quantity, unit_price, total_price)'
    )
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    logStep('Order not found', { orderId, error: orderError });
    await logPaymentEvent(supabase, {
      order_id: orderId,
      event_type: 'webhook_order_not_found',
      status: 'error',
      actor: 'stripe_webhook',
      correlation_id: correlationId,
      error_message: `Order not found: ${orderError?.message}`,
    });
    return;
  }

  // ========================================================================
  // IDEMPOTENCY: If order already processed, skip
  // ========================================================================
  if (order.status === 'paid' || order.status === 'completed') {
    logStep('IDEMPOTENCY: Order already processed by verify-payment', {
      orderId,
    });
    await logPaymentEvent(supabase, {
      order_id: orderId,
      event_type: 'webhook_idempotent_skip',
      status: 'info',
      actor: 'stripe_webhook',
      correlation_id: correlationId,
      details: {
        current_status: order.status,
        message: 'Already processed by client redirect',
      },
    });
    return;
  }

  // ========================================================================
  // ATOMIC STATUS UPDATE with optimistic lock
  // ========================================================================
  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id;

  const { data: updatedOrder, error: updateError } = await supabase
    .from('orders')
    .update({
      status: 'paid',
      order_status: 'paid',
      payment_reference: paymentIntentId,
      payment_method: session.payment_method_types?.[0] || 'card',
      metadata: {
        ...(order.metadata || {}),
        webhook_processed: true,
        webhook_processed_at: new Date().toISOString(),
        correlation_id: correlationId,
        stripe_session_id: session.id,
        payment_intent_id: paymentIntentId,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .eq('status', 'pending') // OPTIMISTIC LOCK
    .select('id')
    .maybeSingle();

  if (updateError) {
    logStep('Error updating order', { error: updateError });
    await logPaymentEvent(supabase, {
      order_id: orderId,
      event_type: 'webhook_update_failed',
      status: 'error',
      actor: 'stripe_webhook',
      correlation_id: correlationId,
      error_message: updateError.message,
    });
    return;
  }

  if (!updatedOrder) {
    logStep('IDEMPOTENCY: Order status already changed by another process');
    await logPaymentEvent(supabase, {
      order_id: orderId,
      event_type: 'webhook_idempotent_race',
      status: 'info',
      actor: 'stripe_webhook',
      correlation_id: correlationId,
      details: { message: 'Lost optimistic lock - another process handled it' },
    });
    return;
  }

  logStep('Order updated to paid via webhook', { orderId });

  // Log status change
  await supabase.from('order_status_history').insert({
    order_id: orderId,
    previous_status: order.order_status || 'payment_pending',
    new_status: 'paid',
    changed_by: 'webhook',
    reason_code: 'STRIPE_WEBHOOK',
    reason_message: 'Payment confirmed via Stripe webhook',
    metadata: {
      stripe_session_id: session.id,
      stripe_event_type: 'checkout.session.completed',
      correlation_id: correlationId,
      payment_intent: paymentIntentId,
    },
  });

  // ========================================================================
  // STOCK DECREMENT (safe - we hold optimistic lock)
  // ========================================================================
  for (const item of order.order_items || []) {
    try {
      const { data: product } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', item.product_id)
        .single();

      if (product) {
        const newStock = Math.max(
          0,
          (product.stock_quantity || 0) - item.quantity
        );
        await supabase
          .from('products')
          .update({
            stock_quantity: newStock,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.product_id);

        logStep('Stock decremented', {
          productId: item.product_id,
          sold: item.quantity,
          newStock,
        });
      }
    } catch (err) {
      logStep('Stock update error (non-fatal)', {
        productId: item.product_id,
        error: (err as Error).message,
      });
    }
  }

  // ========================================================================
  // COUPON USAGE INCREMENT
  // ========================================================================
  const discountCode = session.metadata?.discount_code;
  if (discountCode) {
    try {
      // Use raw increment to avoid race conditions
      const { error: couponError } = await supabase.rpc(
        'increment_coupon_usage',
        {
          p_code: discountCode,
        }
      );
      if (couponError) {
        // Fallback: manual increment
        const { data: coupon } = await supabase
          .from('discount_coupons')
          .select('usage_count')
          .eq('code', discountCode)
          .single();
        if (coupon) {
          await supabase
            .from('discount_coupons')
            .update({ usage_count: (coupon.usage_count || 0) + 1 })
            .eq('code', discountCode);
        }
      }
      logStep('Coupon usage incremented', { code: discountCode });
    } catch (err) {
      logStep('Coupon usage increment error (non-fatal)', {
        error: (err as Error).message,
      });
    }
  }

  // ========================================================================
  // PAYMENT RECORD
  // ========================================================================
  await supabase.from('payments').insert({
    order_id: orderId,
    stripe_payment_intent_id: paymentIntentId,
    amount: order.amount,
    currency: order.currency,
    status: 'completed',
    processed_at: new Date().toISOString(),
    metadata: {
      stripe_session_id: session.id,
      correlation_id: correlationId,
      customer_email: session.customer_details?.email,
      payment_method: session.payment_method_types?.[0],
      source: 'stripe_webhook',
      discount_code: discountCode || null,
    },
  });

  // ========================================================================
  // SEND CONFIRMATION EMAIL (idempotent, non-blocking)
  // ========================================================================
  try {
    const customerEmail = session.customer_details?.email;
    const customerName =
      session.customer_details?.name ||
      session.metadata?.customer_name ||
      'Client';

    if (customerEmail) {
      // IDEMPOTENCY: Check if email was already sent for this order
      const { data: existingEmail } = await supabase
        .from('email_logs')
        .select('id')
        .eq('order_id', orderId)
        .eq('template_name', 'order-confirmation')
        .eq('status', 'sent')
        .maybeSingle();

      if (existingEmail) {
        logStep('IDEMPOTENCY: Confirmation email already sent, skipping', {
          orderId,
        });
      } else {
        const productIds = (order.order_items || []).map(
          (item: any) => item.product_id
        );
        const { data: products } = await supabase
          .from('products')
          .select('id, name, images, price')
          .in('id', productIds);

        const productMap = new Map((products || []).map((p: any) => [p.id, p]));

        const emailItems = (order.order_items || []).map((item: any) => {
          const product = productMap.get(item.product_id);
          return {
            name: product?.name || `Product #${item.product_id}`,
            quantity: item.quantity,
            price: item.unit_price / 100,
            image: product?.images?.[0] || undefined,
          };
        });

        const emailSubtotal = emailItems.reduce(
          (sum: number, item: any) => sum + item.price * item.quantity,
          0
        );
        const total = order.amount / 100;
        const shipping = total - emailSubtotal > 0 ? total - emailSubtotal : 0;

        const shippingAddr = order.shipping_address as any;

        const emailResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-order-confirmation`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({
              orderId,
              customerEmail,
              customerName,
              items: emailItems,
              subtotal: emailSubtotal,
              shipping,
              discount: session.metadata?.discount_amount_cents
                ? parseInt(session.metadata.discount_amount_cents) / 100
                : 0,
              total,
              currency: order.currency?.toUpperCase() || 'EUR',
              shippingAddress: shippingAddr
                ? {
                    address: shippingAddr.address_line1 || '',
                    city: shippingAddr.city || '',
                    postalCode: shippingAddr.postal_code || '',
                    country:
                      shippingAddr.country === 'FR'
                        ? 'France'
                        : shippingAddr.country || 'France',
                  }
                : undefined,
            }),
          }
        );

        if (!emailResponse.ok) {
          const errBody = await emailResponse.text();
          logStep('Email function returned error', {
            status: emailResponse.status,
            body: errBody,
          });
        } else {
          logStep('Confirmation email triggered via webhook', {
            orderId,
            customerEmail,
          });
        }
      }
    } else {
      logStep('No customer email available, skipping confirmation email');
    }
  } catch (emailErr) {
    logStep('Email send error (non-fatal)', {
      error: (emailErr as Error).message,
    });
  }

  // ========================================================================
  // FRAUD DETECTION (non-blocking)
  // ========================================================================
  try {
    let isFirstOrder = true;
    if (order.user_id) {
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
      p_shipping_address: order.shipping_address,
      p_billing_address: order.billing_address,
      p_ip_address: null,
      p_user_agent: null,
      p_checkout_duration_seconds: null,
      p_is_first_order: isFirstOrder,
      p_order_amount: (order.amount || 0) / 100,
    });
    logStep('Fraud detection completed via webhook');
  } catch (fraudErr) {
    logStep('Fraud detection error (non-fatal)', {
      error: (fraudErr as Error).message,
    });
  }

  // Final success event
  await logPaymentEvent(supabase, {
    order_id: orderId,
    event_type: 'payment_confirmed',
    status: 'success',
    actor: 'stripe_webhook',
    correlation_id: correlationId,
    details: {
      payment_intent: paymentIntentId,
      amount: order.amount,
      currency: order.currency,
      discount_code: discountCode || null,
      stock_decremented: true,
      source: 'stripe_webhook',
    },
  });

  logStep('Webhook processing completed', { orderId, correlationId });
}

// ============================================================
// Handle checkout.session.expired
// ============================================================
async function handleCheckoutExpired(
  supabase: ReturnType<typeof createClient>,
  session: Stripe.Checkout.Session
) {
  const orderId = session.metadata?.order_id;
  const correlationId = session.metadata?.correlation_id;

  logStep('Processing checkout.session.expired', {
    sessionId: session.id,
    orderId,
  });

  if (orderId) {
    // Fetch existing metadata to merge, then cancel if still pending
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
          ...(existingOrder?.metadata || {}),
          cancelled_reason: 'stripe_session_expired',
          cancelled_at: new Date().toISOString(),
          correlation_id: correlationId,
        },
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
  supabase: ReturnType<typeof createClient>,
  paymentIntent: Stripe.PaymentIntent
) {
  const orderId = paymentIntent.metadata?.order_id;
  const correlationId = paymentIntent.metadata?.correlation_id;

  logStep('Processing payment_intent.payment_failed', { orderId });

  if (orderId) {
    // Fetch existing metadata to merge
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
          ...(existingOrder?.metadata || {}),
          payment_failed_at: new Date().toISOString(),
          failure_message:
            paymentIntent.last_payment_error?.message || 'Unknown',
          failure_code: paymentIntent.last_payment_error?.code || 'unknown',
          correlation_id: correlationId,
        },
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
  supabase: ReturnType<typeof createClient>,
  event: {
    order_id?: string;
    event_type: string;
    status: string;
    actor: string;
    correlation_id?: string;
    error_message?: string;
    details?: Record<string, unknown>;
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
      details: event.details || {},
      error_message: event.error_message || null,
      ip_address: event.ip_address || null,
      user_agent: event.user_agent || null,
      duration_ms: event.duration_ms || null,
    });
  } catch (err) {
    console.error('[STRIPE-WEBHOOK] Failed to log payment event:', err);
  }
}
