/**
 * order-lookup Edge Function
 *
 * Lightweight, READ-ONLY lookup of order status by `order_id` (canonical) or
 * legacy `session_id` (Stripe `cs_*` or mis-encoded order UUID).
 * Also serves as admin debug endpoint when called with service role key.
 */
import { serve } from '@std/http/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { looksLikeOrderUuid } from './lib/order_uuid.ts';

/** Subset of `orders` row returned by this function’s select. */
type OrderItemRow = {
  id: string;
  product_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_snapshot?: Record<string, unknown> | null;
};

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
  pricing_snapshot?: unknown | null;
  subtotal_amount?: number | null;
  discount_amount?: number | null;
  shipping_amount?: number | null;
  total_amount?: number | null;
  order_items?: OrderItemRow[] | null;
};

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-guest-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr: string = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ORDER-LOOKUP] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl: string = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey: string =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabaseService: SupabaseClient = createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: { persistSession: false },
    }
  );
  const authHeader: string | null = req.headers.get('Authorization');
  const bearerToken: string | null = authHeader?.startsWith('Bearer ')
    ? authHeader.replace('Bearer ', '')
    : null;
  const guestId: string | null = req.headers.get('x-guest-id')?.trim() || null;
  const isInternalServiceCall: boolean =
    !!bearerToken && bearerToken === serviceRoleKey;
  let requesterUserId: string | null = null;

  try {
    if (bearerToken && !isInternalServiceCall) {
      try {
        const anonClient: SupabaseClient = createClient(
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

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ found: false, error: 'Invalid JSON body' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    const body = rawBody as Record<string, unknown>;
    const session_id: string =
      typeof body.session_id === 'string' ? body.session_id.trim() : '';
    const order_id: string =
      typeof body.order_id === 'string' ? body.order_id.trim() : '';

    if (!session_id && !order_id) {
      return new Response(
        JSON.stringify({
          found: false,
          error: 'Missing session_id or order_id',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    logStep('Looking up order', { session_id: session_id || null, order_id });

    const selectFields: string =
      'id, status, order_status, amount, currency, shipping_address, metadata, created_at, user_id, stripe_session_id, pricing_snapshot, subtotal_amount, discount_amount, shipping_amount, total_amount, order_items (id, product_id, quantity, unit_price, total_price, product_snapshot)';

    // Canonical path: explicit order_id (Stripe success URL / email recovery).
    if (order_id) {
      if (!looksLikeOrderUuid(order_id)) {
        return new Response(
          JSON.stringify({ found: false, error: 'Invalid order_id' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }
      const { data: byOrderId }: { data: OrderLookupRow | null } =
        await supabaseService
          .from('orders')
          .select(selectFields)
          .eq('id', order_id)
          .maybeSingle();

      if (!byOrderId) {
        logStep('Order not found by order_id', { order_id });
        return new Response(JSON.stringify({ found: false }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      if (!isAuthorizedForOrder(byOrderId)) {
        logStep('Order access denied (order_id lookup)');
        return new Response(JSON.stringify({ found: false }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      logStep('Found by order_id', {
        orderId: byOrderId.id,
        status: byOrderId.status,
      });
      return buildResponse(byOrderId);
    }

    // Strategy 0: order primary key (mis-encoded email / return URL used order UUID as session_id)
    if (looksLikeOrderUuid(session_id)) {
      const { data: byPk }: { data: OrderLookupRow | null } =
        await supabaseService
          .from('orders')
          .select(selectFields)
          .eq('id', session_id)
          .maybeSingle();

      if (byPk) {
        if (!isAuthorizedForOrder(byPk)) {
          logStep('Order access denied (uuid-shaped session_id)');
          return new Response(JSON.stringify({ found: false }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        }
        logStep('Found by order id (uuid-shaped session_id param)', {
          orderId: byPk.id,
          status: byPk.status,
        });
        return buildResponse(byPk);
      }
    }

    // Strategy 1: stripe_session_id column
    const { data: byColumn }: { data: OrderLookupRow | null } =
      await supabaseService
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
    const {
      data: byMetadata,
      error: byMetadataError,
    }: {
      data: OrderLookupRow | null;
      error: { message: string } | null;
    } = await supabaseService
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
    const msg: string = error instanceof Error ? error.message : String(error);
    logStep('ERROR', { message: msg });
    return new Response(JSON.stringify({ found: false, error: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }

  function buildResponse(order: OrderLookupRow) {
    const status: string = String(order.status || '').toLowerCase();
    const orderStatus: string = String(order.order_status || '').toLowerCase();
    const metadata: Record<string, unknown> = (order.metadata || {}) as Record<
      string,
      unknown
    >;
    const webhookProcessed: boolean =
      metadata.webhook_processed === true ||
      metadata.webhook_processed === 'true';
    const isPaid: boolean =
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
        pricing_snapshot: order.pricing_snapshot ?? null,
        subtotal_amount: order.subtotal_amount ?? null,
        discount_amount: order.discount_amount ?? null,
        shipping_amount: order.shipping_amount ?? null,
        total_amount: order.total_amount ?? null,
        order_items: order.order_items ?? [],
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }

  /**
   * order_id (or UUID-shaped legacy param): guest header or logged-in buyer must match.
   */
  function isAuthorizedForOrder(order: OrderLookupRow): boolean {
    if (isInternalServiceCall) return true;
    if (
      requesterUserId &&
      order?.user_id &&
      requesterUserId === order.user_id
    ) {
      return true;
    }
    const metadata = (order?.metadata || {}) as Record<string, unknown>;
    const orderGuestId =
      typeof metadata.guest_id === 'string' ? metadata.guest_id : null;
    return !!(guestId && orderGuestId && guestId === orderGuestId);
  }

  /**
   * Stripe `cs_*` lookup: session id proves return URL possession; also allow
   * same guest / owner as order_id path.
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
    return isAuthorizedForOrder(order);
  }
});
