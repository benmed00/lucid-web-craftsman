/**
 * verify-payment Edge Function
 * 
 * READ-ONLY verification: checks Stripe session status and returns order info.
 * All MUTATIONS (stock, payment records, status updates) are handled by the
 * stripe-webhook Edge Function which is the AUTHORITATIVE source of truth.
 * 
 * This function is called from PaymentSuccess.tsx when the user returns from Stripe.
 * If the webhook already processed the order, it returns the current status.
 * If the webhook hasn't fired yet, it performs a one-time idempotent confirmation
 * as a fallback (e.g., user returns before webhook arrives).
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-guest-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseService = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  // Try to get authenticated user from request (for order association)
  let authenticatedUserId: string | null = null;
  try {
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const anonClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? ""
      );
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await anonClient.auth.getUser(token);
      authenticatedUserId = user?.id || null;
      if (authenticatedUserId) {
        logStep("Authenticated user detected", { userId: authenticatedUserId });
      }
    }
  } catch {
    logStep("Could not extract user from auth header (non-fatal)");
  }

  try {
    logStep("Function started");

    const { session_id } = await req.json();
    if (!session_id) {
      throw new Error("No session ID provided");
    }

    logStep("Verifying session", { sessionId: session_id });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['customer', 'payment_intent']
    });

    if (!session) {
      throw new Error("Session not found");
    }

    logStep("Session retrieved", {
      paymentStatus: session.payment_status,
      orderId: session.metadata?.order_id,
    });

    if (session.payment_status !== 'paid') {
      return new Response(JSON.stringify({
        success: false,
        message: "Payment not completed",
        status: session.payment_status
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Find order by stripe_session_id
    const { data: orderData, error: orderError } = await supabaseService
      .from('orders')
      .select('id, status, order_status, amount, currency, shipping_address, metadata, created_at')
      .eq('stripe_session_id', session_id)
      .maybeSingle();

    if (orderError || !orderData) {
      logStep("Order not found", { error: orderError });
      throw new Error("Order not found");
    }

    logStep("Order found", { orderId: orderData.id, status: orderData.status, order_status: orderData.order_status });

    // ========================================================================
    // ASSOCIATE ORDER WITH AUTHENTICATED USER (if user_id is null)
    // This handles cases where the order was created from a context without auth
    // (e.g., iframe preview opening Stripe in a new tab)
    // ========================================================================
    if (!orderData.user_id && authenticatedUserId) {
      const { error: assocError } = await supabaseService
        .from('orders')
        .update({ user_id: authenticatedUserId })
        .eq('id', orderData.id)
        .is('user_id', null);

      if (!assocError) {
        logStep("Order associated with authenticated user", { orderId: orderData.id, userId: authenticatedUserId });
      } else {
        logStep("Failed to associate order (non-fatal)", { error: assocError.message });
      }
    }

    // Helper: fetch order items for invoice
    const fetchOrderItems = async (oid: string) => {
      const { data: items } = await supabaseService
        .from('order_items')
        .select('quantity, unit_price, total_price, product_snapshot')
        .eq('order_id', oid);
      return (items || []).map(item => {
        const snapshot = item.product_snapshot as any;
        return {
          product_name: snapshot?.name || 'Product',
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
        };
      });
    };

    const buildInvoiceData = async (oid: string) => {
      const orderItems = await fetchOrderItems(oid);
      const itemsSubtotal = orderItems.reduce((sum: number, i: any) => sum + i.total_price, 0);
      const orderTotal = orderData.amount || itemsSubtotal;
      const shipping = Math.max(0, orderTotal - itemsSubtotal);
      const shippingAddr = orderData.shipping_address as any;
      return {
        items: orderItems,
        subtotal: itemsSubtotal,
        shipping,
        total: orderTotal,
        shippingAddress: shippingAddr ? {
          line1: shippingAddr.address_line1 || shippingAddr.line1 || '',
          line2: shippingAddr.address_line2 || shippingAddr.line2 || '',
          city: shippingAddr.city || '',
          postalCode: shippingAddr.postal_code || shippingAddr.postalCode || '',
          country: shippingAddr.country || 'FR',
        } : null,
        paymentMethod: session.payment_method_types?.[0] || 'card',
        currency: orderData.currency?.toUpperCase() || 'EUR',
        stripeSessionId: session_id,
      };
    };

    // ========================================================================
    // CASE 1: Already processed (by webhook or previous verify call)
    // ========================================================================
    if (orderData.status === 'paid' || orderData.status === 'completed') {
      logStep("Order already processed — returning current status", { orderId: orderData.id });
      const invoice = await buildInvoiceData(orderData.id);
      return new Response(JSON.stringify({
        success: true,
        message: "Commande confirmée",
        orderId: orderData.id,
        customerInfo: session.customer_details ? {
          firstName: session.customer_details.name?.split(' ')[0] || '',
          lastName: session.customer_details.name?.split(' ').slice(1).join(' ') || '',
          email: session.customer_details.email || '',
        } : null,
        invoiceData: {
          ...invoice,
          date: orderData.created_at || new Date().toISOString(),
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // ========================================================================
    // CASE 2: Webhook hasn't fired yet — perform fallback confirmation
    // Uses the same idempotent optimistic lock as the webhook
    // ========================================================================
    logStep("Webhook hasn't processed yet — performing fallback confirmation");

    const paymentIntentId = typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id;

    const correlationId = session.metadata?.correlation_id || orderData.metadata?.correlation_id;

    // Optimistic lock: only update if still 'pending'
    const { data: updatedOrder, error: updateError } = await supabaseService
      .from('orders')
      .update({
        status: 'paid',
        order_status: 'paid',
        payment_reference: paymentIntentId,
        payment_method: session.payment_method_types?.[0] || 'card',
        metadata: {
          ...(orderData.metadata || {}),
          verified_by: 'client_redirect',
          verified_at: new Date().toISOString(),
          correlation_id: correlationId,
          payment_intent_id: paymentIntentId,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderData.id)
      .eq('status', 'pending') // OPTIMISTIC LOCK
      .select('id')
      .maybeSingle();

    if (updateError) {
      logStep("Update error", { error: updateError });
      throw new Error(`Failed to update order: ${updateError.message}`);
    }

    if (!updatedOrder) {
      // Lost the race to the webhook — that's fine, order is processed
      logStep("Lost optimistic lock — webhook likely processed first");
      return new Response(JSON.stringify({
        success: true,
        message: "Commande confirmée",
        orderId: orderData.id,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // We won the lock — need to do the critical mutations
    logStep("Won optimistic lock — processing order", { orderId: orderData.id });

    // Log status change
    await supabaseService.from('order_status_history').insert({
      order_id: orderData.id,
      previous_status: 'payment_pending',
      new_status: 'paid',
      changed_by: 'system',
      reason_code: 'PAYMENT_CONFIRMED',
      reason_message: 'Payment verified via client redirect (webhook fallback)',
      metadata: {
        stripe_session_id: session_id,
        correlation_id: correlationId,
        payment_intent: paymentIntentId,
        source: 'verify-payment',
      }
    });

    // Stock decrement
    const { data: orderItems } = await supabaseService
      .from('order_items')
      .select('product_id, quantity')
      .eq('order_id', orderData.id);

    if (orderItems) {
      for (const item of orderItems) {
        try {
          const { data: product } = await supabaseService
            .from('products')
            .select('stock_quantity')
            .eq('id', item.product_id)
            .single();

          if (product) {
            const newStock = Math.max(0, (product.stock_quantity || 0) - item.quantity);
            await supabaseService
              .from('products')
              .update({ stock_quantity: newStock, updated_at: new Date().toISOString() })
              .eq('id', item.product_id);
            logStep("Stock decremented", { productId: item.product_id, sold: item.quantity, newStock });
          }
        } catch (err) {
          logStep("Stock update error (non-fatal)", { productId: item.product_id, error: (err as Error).message });
        }
      }
    }

    // Create payment record
    await supabaseService.from('payments').insert({
      order_id: orderData.id,
      stripe_payment_intent_id: paymentIntentId,
      amount: orderData.amount,
      currency: orderData.currency,
      status: 'completed',
      processed_at: new Date().toISOString(),
      metadata: {
        stripe_session_id: session_id,
        correlation_id: correlationId,
        customer_email: session.customer_details?.email,
        payment_method: session.payment_method_types?.[0],
        source: 'client_redirect_fallback',
      }
    });

    // Increment coupon usage
    const discountCode = session.metadata?.discount_code;
    if (discountCode) {
      try {
        const { data: coupon } = await supabaseService
          .from('discount_coupons')
          .select('usage_count')
          .eq('code', discountCode)
          .single();
        if (coupon) {
          await supabaseService
            .from('discount_coupons')
            .update({ usage_count: (coupon.usage_count || 0) + 1 })
            .eq('code', discountCode);
        }
      } catch (err) {
        logStep("Coupon increment error (non-fatal)", { error: (err as Error).message });
      }
    }

    // Log payment event
    try {
      await supabaseService.from('payment_events').insert({
        order_id: orderData.id,
        correlation_id: correlationId,
        event_type: 'payment_confirmed',
        status: 'success',
        actor: 'verify_payment_fallback',
        details: {
          payment_intent: paymentIntentId,
          amount: orderData.amount,
          source: 'client_redirect_fallback',
        },
      });
    } catch (err) {
      logStep("Event logging error (non-fatal)", { error: (err as Error).message });
    }

    // Send confirmation email (non-blocking)
    try {
      const customerEmail = session.customer_details?.email;
      const customerName = session.customer_details?.name || session.metadata?.customer_name || 'Client';

      if (customerEmail && orderItems) {
        const productIds = orderItems.map(item => item.product_id);
        const { data: products } = await supabaseService
          .from('products')
          .select('id, name, images, price')
          .in('id', productIds);

        const productMap = new Map((products || []).map(p => [p.id, p]));

        const emailItems = orderItems.map(item => {
          const product = productMap.get(item.product_id);
          return {
            name: product?.name || `Product #${item.product_id}`,
            quantity: item.quantity,
            price: (product?.price || 0),
            image: product?.images?.[0] || undefined,
          };
        });

        const emailSubtotal = emailItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const total = orderData.amount / 100;
        const shipping = total - emailSubtotal > 0 ? total - emailSubtotal : 0;

        const shippingAddr = orderData.shipping_address as any;

        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-order-confirmation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            orderId: orderData.id,
            customerEmail,
            customerName,
            items: emailItems,
            subtotal: emailSubtotal,
            shipping,
            total,
            currency: orderData.currency?.toUpperCase() || 'EUR',
            shippingAddress: shippingAddr ? {
              address: shippingAddr.address_line1 || '',
              city: shippingAddr.city || '',
              postalCode: shippingAddr.postal_code || '',
              country: shippingAddr.country === 'FR' ? 'France' : shippingAddr.country || 'France',
            } : undefined,
          }),
        });
        logStep("Confirmation email sent");
      }
    } catch (emailErr) {
      logStep("Email error (non-fatal)", { error: (emailErr as Error).message });
    }

    // Fraud detection (non-blocking)
    try {
      let isFirstOrder = true;
      if (orderData.metadata?.user_id) {
        const { count } = await supabaseService
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', orderData.metadata.user_id as string)
          .neq('id', orderData.id)
          .eq('status', 'paid');
        isFirstOrder = (count || 0) === 0;
      }

      await supabaseService.rpc('calculate_fraud_score', {
        p_order_id: orderData.id,
        p_customer_email: session.customer_details?.email || '',
        p_shipping_address: orderData.shipping_address,
        p_billing_address: orderData.shipping_address,
        p_ip_address: null,
        p_user_agent: null,
        p_checkout_duration_seconds: null,
        p_is_first_order: isFirstOrder,
        p_order_amount: orderData.amount / 100,
      });
    } catch (fraudErr) {
      logStep("Fraud detection error (non-fatal)", { error: (fraudErr as Error).message });
    }

    logStep("Verification completed", { orderId: orderData.id });

    const invoice = await buildInvoiceData(orderData.id);

    return new Response(JSON.stringify({
      success: true,
      message: "Commande confirmée",
      orderId: orderData.id,
      customerInfo: session.customer_details ? {
        firstName: session.customer_details.name?.split(' ')[0] || '',
        lastName: session.customer_details.name?.split(' ').slice(1).join(' ') || '',
        email: session.customer_details.email || '',
      } : null,
      invoiceData: {
        ...invoice,
        date: orderData.created_at || new Date().toISOString(),
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in verify-payment", { message: errorMessage });
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
