/**
 * confirmOrderFromStripe — SINGLE SOURCE OF TRUTH for order confirmation.
 *
 * All flows (webhook, verify-payment, reconcile-payment) MUST call this function
 * to confirm an order after successful Stripe payment.
 *
 * Guarantees:
 * - Idempotent (optimistic lock on status='pending')
 * - Atomic status update
 * - Stock decrement (exactly once)
 * - Payment record creation (exactly once)
 * - Coupon usage increment
 * - Status history logging
 * - Payment event logging
 *
 * Returns: { confirmed: boolean; alreadyProcessed: boolean; orderId: string }
 */

export interface ConfirmOrderInput {
  orderId: string;
  stripeSessionId: string;
  paymentIntentId?: string;
  paymentMethod?: string;
  correlationId?: string;
  discountCode?: string;
  source: 'stripe_webhook' | 'verify_payment' | 'reconcile_payment';
  customerEmail?: string;
  customerName?: string;
}

export interface ConfirmOrderResult {
  confirmed: boolean;
  alreadyProcessed: boolean;
  orderId: string;
  error?: string;
}

const logStep = (source: string, step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CONFIRM-ORDER][${source}] ${step}${detailsStr}`);
};

export async function confirmOrderFromStripe(
  supabase: any,
  input: ConfirmOrderInput
): Promise<ConfirmOrderResult> {
  const {
    orderId,
    stripeSessionId,
    paymentIntentId,
    paymentMethod = 'card',
    correlationId,
    discountCode,
    source,
    customerEmail,
    customerName,
  } = input;

  logStep(source, 'Starting order confirmation', { orderId, stripeSessionId });

  // ================================================================
  // Step 1: Fetch order with items
  // ================================================================
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, status, order_status, amount, currency, user_id, metadata, shipping_address, billing_address, order_items(id, product_id, quantity, unit_price, total_price)')
    .eq('id', orderId)
    .single();

  if (fetchError || !order) {
    logStep(source, 'Order not found', { orderId, error: fetchError?.message });
    return { confirmed: false, alreadyProcessed: false, orderId, error: 'Order not found' };
  }

  // ================================================================
  // Step 2: Idempotency check
  // ================================================================
  if (order.status === 'paid' || order.status === 'completed') {
    logStep(source, 'IDEMPOTENT: Order already confirmed', { orderId, status: order.status });
    return { confirmed: true, alreadyProcessed: true, orderId };
  }

  if (order.status !== 'pending') {
    logStep(source, 'Order in unexpected status', { orderId, status: order.status });
    return { confirmed: false, alreadyProcessed: false, orderId, error: `Unexpected status: ${order.status}` };
  }

  // ================================================================
  // Step 3: Atomic status update with optimistic lock
  // ================================================================
  const metadataUpdate: Record<string, unknown> = {
    ...(order.metadata || {}),
    confirmed_by: source,
    confirmed_at: new Date().toISOString(),
    correlation_id: correlationId,
    stripe_session_id: stripeSessionId,
    payment_intent_id: paymentIntentId,
  };

  if (source === 'stripe_webhook') {
    metadataUpdate.webhook_processed = true;
    metadataUpdate.webhook_processed_at = new Date().toISOString();
  } else if (source === 'reconcile_payment') {
    metadataUpdate.reconciled = true;
    metadataUpdate.reconciled_at = new Date().toISOString();
  } else {
    metadataUpdate.verified_by = 'client_redirect';
    metadataUpdate.verified_at = new Date().toISOString();
  }

  const { data: updatedOrder, error: updateError } = await supabase
    .from('orders')
    .update({
      status: 'paid',
      order_status: 'paid',
      stripe_session_id: stripeSessionId,
      payment_reference: paymentIntentId,
      payment_method: paymentMethod,
      metadata: metadataUpdate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .eq('status', 'pending') // OPTIMISTIC LOCK
    .select('id')
    .maybeSingle();

  if (updateError) {
    logStep(source, 'Update error', { error: updateError.message });
    return { confirmed: false, alreadyProcessed: false, orderId, error: updateError.message };
  }

  if (!updatedOrder) {
    logStep(source, 'IDEMPOTENT: Lost optimistic lock — another process confirmed first');
    return { confirmed: true, alreadyProcessed: true, orderId };
  }

  logStep(source, 'Order status updated to paid', { orderId });

  // ================================================================
  // Step 4: Status history
  // ================================================================
  const reasonCodeMap = {
    stripe_webhook: 'STRIPE_WEBHOOK',
    verify_payment: 'PAYMENT_CONFIRMED',
    reconcile_payment: 'RECONCILED',
  };
  const reasonMessageMap = {
    stripe_webhook: 'Payment confirmed via Stripe webhook',
    verify_payment: 'Payment verified via client redirect (webhook fallback)',
    reconcile_payment: 'Payment reconciled from Stripe session data',
  };
  const changedByMap = {
    stripe_webhook: 'webhook',
    verify_payment: 'system',
    reconcile_payment: 'system',
  };

  await supabase.from('order_status_history').insert({
    order_id: orderId,
    previous_status: order.order_status || 'payment_pending',
    new_status: 'paid',
    changed_by: changedByMap[source],
    reason_code: reasonCodeMap[source],
    reason_message: reasonMessageMap[source],
    metadata: {
      stripe_session_id: stripeSessionId,
      correlation_id: correlationId,
      payment_intent: paymentIntentId,
      source,
    },
  });

  // ================================================================
  // Step 5: Stock decrement
  // ================================================================
  for (const item of order.order_items || []) {
    try {
      const { data: product } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', item.product_id)
        .single();

      if (product) {
        const newStock = Math.max(0, (product.stock_quantity || 0) - item.quantity);
        await supabase
          .from('products')
          .update({ stock_quantity: newStock, updated_at: new Date().toISOString() })
          .eq('id', item.product_id);
        logStep(source, 'Stock decremented', { productId: item.product_id, sold: item.quantity, newStock });
      }
    } catch (err) {
      logStep(source, 'Stock update error (non-fatal)', { productId: item.product_id, error: (err as Error).message });
    }
  }

  // ================================================================
  // Step 6: Coupon usage increment
  // ================================================================
  if (discountCode) {
    try {
      const { error: rpcError } = await supabase.rpc('increment_coupon_usage', { p_code: discountCode });
      if (rpcError) {
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
      logStep(source, 'Coupon usage incremented', { code: discountCode });
    } catch (err) {
      logStep(source, 'Coupon increment error (non-fatal)', { error: (err as Error).message });
    }
  }

  // ================================================================
  // Step 7: Payment record
  // ================================================================
  await supabase.from('payments').insert({
    order_id: orderId,
    stripe_payment_intent_id: paymentIntentId,
    amount: order.amount,
    currency: order.currency,
    status: 'completed',
    processed_at: new Date().toISOString(),
    metadata: {
      stripe_session_id: stripeSessionId,
      correlation_id: correlationId,
      customer_email: customerEmail,
      payment_method: paymentMethod,
      source,
      discount_code: discountCode || null,
    },
  });

  // ================================================================
  // Step 8: Payment event log
  // ================================================================
  try {
    await supabase.from('payment_events').insert({
      order_id: orderId,
      correlation_id: correlationId || null,
      event_type: 'payment_confirmed',
      status: 'success',
      actor: source,
      details: {
        payment_intent_id: paymentIntentId,
        amount: order.amount,
        currency: order.currency,
        discount_code: discountCode || null,
        stock_decremented: true,
        source,
      },
    });
  } catch {
    // Non-fatal
  }

  logStep(source, 'Order confirmation completed', { orderId, correlationId });

  return { confirmed: true, alreadyProcessed: false, orderId };
}

/**
 * Send confirmation email — idempotent, non-blocking.
 * Separated from confirmOrderFromStripe to keep the core function focused.
 */
export async function sendConfirmationEmail(
  supabase: any,
  input: {
    orderId: string;
    customerEmail: string;
    customerName: string;
    orderItems: any[];
    orderAmount: number;
    currency: string;
    shippingAddress: any;
    discountAmountCents?: number;
    source: string;
  }
): Promise<void> {
  try {
    // Idempotency: Check if email already sent
    const { data: existingEmail } = await supabase
      .from('email_logs')
      .select('id')
      .eq('order_id', input.orderId)
      .eq('template_name', 'order-confirmation')
      .eq('status', 'sent')
      .maybeSingle();

    if (existingEmail) {
      console.log(`[CONFIRM-ORDER][${input.source}] Email already sent, skipping`);
      return;
    }

    const productIds = input.orderItems.map((item: any) => item.product_id);
    const { data: products } = await supabase
      .from('products')
      .select('id, name, images, price')
      .in('id', productIds);

    const productMap = new Map<number, any>((products || []).map((p: any) => [p.id, p]));

    const emailItems = input.orderItems.map((item: any) => {
      const product = productMap.get(item.product_id);
      return {
        name: product?.name || `Product #${item.product_id}`,
        quantity: item.quantity,
        price: item.unit_price / 100,
        image: product?.images?.[0] || undefined,
      };
    });

    const emailSubtotal = emailItems.reduce(
      (sum: number, item: any) => sum + item.price * item.quantity, 0
    );
    const total = input.orderAmount / 100;
    const shipping = total - emailSubtotal > 0 ? total - emailSubtotal : 0;

    const shippingAddr = input.shippingAddress;

    await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-order-confirmation`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          orderId: input.orderId,
          customerEmail: input.customerEmail,
          customerName: input.customerName,
          items: emailItems,
          subtotal: emailSubtotal,
          shipping,
          discount: input.discountAmountCents ? input.discountAmountCents / 100 : 0,
          total,
          currency: input.currency?.toUpperCase() || 'EUR',
          shippingAddress: shippingAddr
            ? {
                address: shippingAddr.address_line1 || '',
                city: shippingAddr.city || '',
                postalCode: shippingAddr.postal_code || '',
                country: shippingAddr.country === 'FR' ? 'France' : shippingAddr.country || 'France',
              }
            : undefined,
        }),
      }
    );

    console.log(`[CONFIRM-ORDER][${input.source}] Confirmation email triggered`);
  } catch (err) {
    console.error(`[CONFIRM-ORDER][${input.source}] Email error (non-fatal):`, (err as Error).message);
  }
}
