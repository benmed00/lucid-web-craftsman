/**
 * order-lookup Edge Function
 *
 * Lightweight, READ-ONLY lookup of order status by stripe_session_id.
 * Used by PaymentSuccess page to avoid calling verify-payment unnecessarily.
 * Also serves as admin debug endpoint when called with service role key.
 */
import { serve } from '@std/http/server';
import { createClient } from '@supabase/supabase-js';

/** Subset of `orders` row returned by this function’s select. */
type OrderLookupRow = {
  id: string;
  status?: string | null;
  order_status?: string | null;
  amount?: number | null;
  currency?: string | null;
  created_at?: string | null;
  stripe_session_id?: string | null;
  metadata?: Record<string, unknown> | null;
  user_id?: string | null;
};

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

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabaseService = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const authHeader = req.headers.get('Authorization');
  const bearerToken = authHeader?.startsWith('Bearer ')
    ? authHeader.replace('Bearer ', '')
    : null;
  const guestId = req.headers.get('x-guest-id')?.trim() || null;
  const isInternalServiceCall = !!bearerToken && bearerToken === serviceRoleKey;
  let requesterUserId: string | null = null;

  try {
    if (bearerToken && !isInternalServiceCall) {
      try {
        const anonClient = createClient(
          supabaseUrl,
          Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        );
        const {
          data: { user },
        } = await anonClient.auth.getUser(bearerToken);
        requesterUserId = user?.id || null;
      } catch {
        requesterUserId = null;
      }
    }

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
      if (!isAuthorized(byColumn, session_id)) {
        logStep('Order access denied by ownership rules');
        return new Response(JSON.stringify({ found: false }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      logStep('Found by stripe_session_id column', {
        orderId: byColumn.id,
        status: byColumn.status,
      });
      return buildResponse(byColumn);
    }

    // Strategy 2: metadata contains stripe_session_id
    const { data: byMetadata, error: byMetadataError } = await supabaseService
      .from('orders')
      .select(selectFields)
      .contains('metadata', { stripe_session_id: session_id })
      .maybeSingle();

    if (byMetadata && !byMetadataError) {
      if (!isAuthorized(byMetadata, session_id)) {
        logStep('Order access denied by ownership rules');
        return new Response(JSON.stringify({ found: false }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
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

  function buildResponse(order: OrderLookupRow) {
    const status = String(order.status || '').toLowerCase();
    const orderStatus = String(order.order_status || '').toLowerCase();
    const metadata = (order.metadata || {}) as Record<string, unknown>;
    const webhookProcessed =
      metadata.webhook_processed === true ||
      metadata.webhook_processed === 'true';
    const isPaid =
      status === 'paid' ||
      status === 'completed' ||
      orderStatus === 'paid' ||
      orderStatus === 'completed' ||
      webhookProcessed;

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

  /**
   * Read-only lookup: the caller must present the same Stripe Checkout session id
   * that is stored on the order (column or metadata). This matches the browser
   * success redirect and avoids false denials when another Supabase session
   * (e.g. admin) is active in the same profile.
   */
  function isAuthorized(
    order: OrderLookupRow,
    requestedSessionId: string
  ): boolean {
    if (isInternalServiceCall) return true;
    if (!requestedSessionId) return false;
    if (order?.stripe_session_id === requestedSessionId) return true;
    const metadata = (order?.metadata || {}) as Record<string, unknown>;
    if (metadata.stripe_session_id === requestedSessionId) return true;
    if (
      requesterUserId &&
      order?.user_id &&
      requesterUserId === order.user_id
    ) {
      return true;
    }
    const orderGuestId =
      typeof metadata.guest_id === 'string' ? metadata.guest_id : null;
    return !!(guestId && orderGuestId && guestId === orderGuestId);
  }
});
