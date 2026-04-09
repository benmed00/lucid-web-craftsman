/**
 * reconcile-payment Edge Function — SELF-HEALING ORDER RECOVERY
 *
 * Called by the frontend when an order is not found after polling.
 * Uses the CENTRALIZED confirmOrderFromStripe for consistent behavior.
 */
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@18.5.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { confirmOrderFromStripe } from '../_shared/confirm-order.ts';

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
    // Step 1: Check current order status
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

    // Order already paid — idempotent return
    if (existingOrder && (existingOrder.status === 'paid' || existingOrder.status === 'completed')) {
      logStep('IDEMPOTENT: Order already paid', { orderId });
      return new Response(
        JSON.stringify({
          success: true, reconciled: false, order_id: existingOrder.id,
          status: existingOrder.status, message: 'Order already confirmed',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Order not found
    if (!existingOrder) {
      logStep('Order not found in database', { orderId });
      return new Response(
        JSON.stringify({ success: false, reconciled: false, error: 'Order not found', order_id: orderId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // No Stripe session to reconcile with
    if (!existingOrder.stripe_session_id) {
      logStep('No Stripe session to reconcile', { orderId, status: existingOrder.status });
      return new Response(
        JSON.stringify({
          success: false, reconciled: false, order_id: orderId,
          status: existingOrder.status, message: 'No Stripe session associated',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // ================================================================
    // Step 2: Verify with Stripe
    // ================================================================
    logStep('Checking Stripe session', { orderId, stripeSessionId: existingOrder.stripe_session_id });

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2025-08-27.basil',
    });

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.retrieve(existingOrder.stripe_session_id);
    } catch (stripeErr) {
      logStep('Stripe API error', { error: (stripeErr as Error).message });
      return new Response(
        JSON.stringify({
          success: false, error: 'Unable to verify with Stripe',
          order_id: orderId, status: existingOrder.status,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    if (session.payment_status !== 'paid') {
      logStep('Stripe session not paid', { paymentStatus: session.payment_status });
      return new Response(
        JSON.stringify({
          success: false, reconciled: false, order_id: orderId,
          status: existingOrder.status, stripe_status: session.payment_status,
          message: 'Payment not yet completed in Stripe',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // ================================================================
    // Step 3: CENTRALIZED confirmation
    // ================================================================
    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : (session.payment_intent as any)?.id;

    const correlationId = session.metadata?.correlation_id ||
      (existingOrder.metadata as any)?.correlation_id;

    const result = await confirmOrderFromStripe(supabaseService, {
      orderId,
      stripeSessionId: existingOrder.stripe_session_id,
      paymentIntentId,
      paymentMethod: session.payment_method_types?.[0] || 'card',
      correlationId,
      discountCode: session.metadata?.discount_code,
      source: 'reconcile_payment',
      customerEmail: session.customer_details?.email,
      customerName: session.customer_details?.name,
    });

    if (result.alreadyProcessed) {
      logStep('Already processed by another flow');
      return new Response(
        JSON.stringify({
          success: true, reconciled: false, order_id: orderId,
          message: 'Order already processed by webhook or verify-payment',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    if (!result.confirmed) {
      logStep('Reconciliation failed', { error: result.error });
      return new Response(
        JSON.stringify({ success: false, error: result.error || 'Failed to reconcile' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    logStep('ORDER RECONCILED SUCCESSFULLY', { orderId });

    return new Response(
      JSON.stringify({
        success: true, reconciled: true, order_id: orderId,
        status: 'paid', message: 'Order successfully reconciled',
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
