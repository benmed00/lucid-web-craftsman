/**
 * order-lookup Edge Function
 *
 * Lightweight, READ-ONLY lookup of order status by stripe_session_id.
 * Used by PaymentSuccess page to avoid calling verify-payment unnecessarily.
 * Also serves as admin debug endpoint when called with service role key.
 */
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-guest-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ORDER-LOOKUP] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseService = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    const { session_id } = await req.json();
    if (!session_id) {
      return new Response(
        JSON.stringify({ found: false, error: 'Missing session_id' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    logStep('Looking up order', { session_id });

    const selectFields =
      'id, status, order_status, amount, currency, shipping_address, metadata, created_at, user_id';

    // Strategy 1: stripe_session_id column
    const { data: byColumn } = await supabaseService
      .from('orders')
      .select(selectFields)
      .eq('stripe_session_id', session_id)
      .maybeSingle();

    if (byColumn) {
      logStep('Found by stripe_session_id column', {
        orderId: byColumn.id,
        status: byColumn.status,
      });
      return buildResponse(byColumn);
    }

    // Strategy 2: metadata contains stripe_session_id
    const { data: byMetadata } = await supabaseService
      .from('orders')
      .select(selectFields)
      .contains('metadata', { stripe_session_id: session_id })
      .maybeSingle();

    if (byMetadata) {
      logStep('Found by metadata', {
        orderId: byMetadata.id,
        status: byMetadata.status,
      });
      return buildResponse(byMetadata);
    }

    logStep('Order not found', { session_id });
    return new Response(JSON.stringify({ found: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep('ERROR', { message: msg });
    return new Response(JSON.stringify({ found: false, error: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }

  function buildResponse(order: any) {
    const status = String(order.status || '').toLowerCase();
    const metadata = (order.metadata || {}) as Record<string, unknown>;
    const isPaid = status === 'paid' || status === 'completed';
    const webhookProcessed =
      metadata.webhook_processed === true ||
      metadata.webhook_processed === 'true';

    return new Response(
      JSON.stringify({
        found: true,
        order_id: order.id,
        status: order.status,
        order_status: order.order_status,
        is_paid: isPaid,
        webhook_processed: webhookProcessed,
        amount: order.amount,
        currency: order.currency,
        created_at: order.created_at,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }
});
