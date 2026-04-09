/**
 * reconcile-payment Edge Function — SELF-HEALING ORDER RECOVERY
 *
 * Called by the frontend when an order is not found after polling.
 * Fetches the Stripe session, verifies payment, and ensures the order
 * exists and is marked as paid in the database.
 *
 * This is the last line of defense: if the webhook failed AND verify-payment
 * wasn't called, this function recovers the order from Stripe data.
 */
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@18.5.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-guest-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RECONCILE-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabaseService = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    const body = await req.json();
    const orderId: string | null = body.order_id || null;

    if (!orderId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing order_id' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    logStep('Reconciliation started', { orderId });

    // ================================================================
    // Step 1: Check if order already exists and is paid
    // ================================================================
    const { data: existingOrder, error: fetchError } = await supabaseService
      .from('orders')
      .select('id, status, order_status, stripe_session_id, amount, currency, metadata')
      .eq('id', orderId)
      .maybeSingle();

    if (fetchError) {
      logStep('DB fetch error', { error: fetchError.message });
      return new Response(
        JSON.stringify({ success: false, error: 'Database error' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Case: Order already paid — idempotent return
    if (existingOrder && (existingOrder.status === 'paid' || existingOrder.status === 'completed')) {
      logStep('IDEMPOTENT: Order already paid', { orderId });
      return new Response(
        JSON.stringify({
          success: true,
          reconciled: false,
          order_id: existingOrder.id,
          status: existingOrder.status,
          message: 'Order already confirmed',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Case: Order exists but pending — try to confirm via Stripe
    if (existingOrder && existingOrder.stripe_session_id) {
      logStep('Order pending, checking Stripe session', {
        orderId,
        stripeSessionId: existingOrder.stripe_session_id,
      });

      const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
        apiVersion: '2025-08-27.basil',
      });

      try {
        const session = await stripe.checkout.sessions.retrieve(existingOrder.stripe_session_id);

        if (session.payment_status !== 'paid') {
          logStep('Stripe session not paid', { paymentStatus: session.payment_status });
          return new Response(
            JSON.stringify({
              success: false,
              reconciled: false,
              order_id: orderId,
              status: existingOrder.status,
              stripe_status: session.payment_status,
              message: 'Payment not yet completed in Stripe',
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          );
        }

        // Payment IS paid in Stripe — reconcile the order
        const paymentIntentId =
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : (session.payment_intent as any)?.id;

        const correlationId = session.metadata?.correlation_id ||
          (existingOrder.metadata as any)?.correlation_id;

        // Optimistic lock update
        const { data: updated, error: updateError } = await supabaseService
          .from('orders')
          .update({
            status: 'paid',
            order_status: 'paid',
            payment_reference: paymentIntentId,
            payment_method: session.payment_method_types?.[0] || 'card',
            metadata: {
              ...(existingOrder.metadata as object || {}),
              reconciled: true,
              reconciled_at: new Date().toISOString(),
              reconciled_by: 'reconcile-payment',
              correlation_id: correlationId,
              payment_intent_id: paymentIntentId,
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId)
          .eq('status', 'pending') // OPTIMISTIC LOCK
          .select('id')
          .maybeSingle();

        if (updateError) {
          logStep('Update error during reconciliation', { error: updateError.message });
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to update order' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          );
        }

        if (!updated) {
          // Lost the race — another process already updated it
          logStep('IDEMPOTENT: Order already processed by another flow');
          return new Response(
            JSON.stringify({
              success: true,
              reconciled: false,
              order_id: orderId,
              message: 'Order already processed by webhook or verify-payment',
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          );
        }

        // Successfully reconciled — log status change
        await supabaseService.from('order_status_history').insert({
          order_id: orderId,
          previous_status: 'payment_pending',
          new_status: 'paid',
          changed_by: 'system',
          reason_code: 'RECONCILED',
          reason_message: 'Payment reconciled from Stripe session data',
          metadata: {
            stripe_session_id: existingOrder.stripe_session_id,
            correlation_id: correlationId,
            payment_intent: paymentIntentId,
            source: 'reconcile-payment',
          },
        });

        // Stock decrement
        const { data: orderItems } = await supabaseService
          .from('order_items')
          .select('product_id, quantity')
          .eq('order_id', orderId);

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
                logStep('Stock decremented', { productId: item.product_id, newStock });
              }
            } catch (err) {
              logStep('Stock update error (non-fatal)', { error: (err as Error).message });
            }
          }
        }

        // Payment record
        await supabaseService.from('payments').insert({
          order_id: orderId,
          stripe_payment_intent_id: paymentIntentId,
          amount: existingOrder.amount,
          currency: existingOrder.currency,
          status: 'completed',
          processed_at: new Date().toISOString(),
          metadata: {
            stripe_session_id: existingOrder.stripe_session_id,
            correlation_id: correlationId,
            source: 'reconcile-payment',
          },
        });

        // Log payment event
        try {
          await supabaseService.from('payment_events').insert({
            order_id: orderId,
            correlation_id: correlationId || null,
            event_type: 'payment_reconciled',
            status: 'success',
            actor: 'reconcile-payment',
            details: {
              stripe_session_id: existingOrder.stripe_session_id,
              payment_intent_id: paymentIntentId,
              amount: existingOrder.amount,
            },
          });
        } catch {
          // Non-fatal
        }

        logStep('ORDER RECONCILED SUCCESSFULLY', { orderId });

        return new Response(
          JSON.stringify({
            success: true,
            reconciled: true,
            order_id: orderId,
            status: 'paid',
            message: 'Order successfully reconciled from Stripe data',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );

      } catch (stripeErr) {
        logStep('Stripe API error during reconciliation', {
          error: (stripeErr as Error).message,
        });
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Unable to verify with Stripe',
            order_id: orderId,
            status: existingOrder.status,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
    }

    // Case: Order not found at all
    if (!existingOrder) {
      logStep('Order not found in database', { orderId });
      return new Response(
        JSON.stringify({
          success: false,
          reconciled: false,
          error: 'Order not found',
          order_id: orderId,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Case: Order exists but no stripe_session_id
    logStep('Order exists but no Stripe session to reconcile', { orderId, status: existingOrder.status });
    return new Response(
      JSON.stringify({
        success: false,
        reconciled: false,
        order_id: orderId,
        status: existingOrder.status,
        message: 'No Stripe session associated with this order',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep('ERROR', { message: msg });
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
