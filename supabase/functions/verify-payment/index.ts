/**
 * verify-payment Edge Function
 *
 * READ-ONLY verification: checks Stripe session status and returns order info.
 * All MUTATIONS (stock, payment records, status updates) are handled by the
 * stripe-webhook Edge Function which is the AUTHORITATIVE source of truth.
 *
 * The storefront **Stripe success path** uses `order-lookup` only; this function
 * remains for tooling, tests, or legacy clients. UUID shape checks must stay aligned
 * with `src/lib/checkout/orderUuid.ts` and `order-lookup/lib/order_uuid.ts`.
 */
import { serve } from '@std/http/server';
import Stripe from 'stripe';
import {
  createClient,
  type PostgrestError,
  type SupabaseClient,
  type User,
} from '@supabase/supabase-js';

/** Shape of `orders` rows used for auth / confirmation helpers (no generated DB types). */
type OrderRowForAccess = {
  id?: string | null;
  status?: string | null;
  order_status?: string | null;
  stripe_session_id?: string | null;
  user_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

/** Full `orders` row shape returned by this function’s shared select list. */
type OrderSelectRow = OrderRowForAccess & {
  amount?: number | null;
  currency?: string | null;
  shipping_address?: Record<string, unknown> | null;
  created_at?: string | null;
};

type OrderItemSelectRow = {
  product_id?: number | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_snapshot: Record<string, unknown> | null;
};

type InvoiceLineItem = {
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  /** From `order_items.product_id` — SPA links to `/products/:id`. */
  product_id?: number;
  /** First URL from `product_snapshot.images` when present. */
  image_url?: string | null;
};

function primaryImageFromSnapshot(
  snapshot: Record<string, unknown> | null
): string | null {
  if (!snapshot) return null;
  const images = snapshot.images;
  if (Array.isArray(images) && images[0] != null) return String(images[0]);
  if (typeof images === 'string' && images.length > 0) return images;
  return null;
}

function mapOrderItemRowToInvoiceLine(
  item: OrderItemSelectRow
): InvoiceLineItem {
  const snapshot: Record<string, unknown> | null = item.product_snapshot;
  const pid = item.product_id;
  const productIdNum =
    typeof pid === 'number' && !Number.isNaN(pid)
      ? pid
      : typeof pid === 'string' && pid !== ''
        ? Number(pid)
        : NaN;
  return {
    product_name: (snapshot?.name as string) || 'Product',
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.total_price,
    product_id: Number.isFinite(productIdNum) ? productIdNum : undefined,
    image_url: primaryImageFromSnapshot(snapshot),
  };
}

type NormalizedShippingAddress = {
  line1: string;
  line2: string;
  city: string;
  postalCode: string;
  country: string;
};

/** Invoice block returned to the SPA (JSON shape unchanged). */
type InvoicePayload = {
  items: InvoiceLineItem[];
  subtotal: number;
  shipping: number;
  total: number;
  shippingAddress: NormalizedShippingAddress | null;
  paymentMethod: string;
  currency: string;
  stripeSessionId: string;
};

type StripeSummaryLine = {
  name: string;
  quantity: number;
  total: number;
};

type StripeSessionSummaryPayload = {
  session_id: string;
  customer_email: string | null;
  amount_total: number;
  currency: string;
  payment_status: Stripe.Checkout.Session['payment_status'];
  items: StripeSummaryLine[];
};

type VerifyPaymentRequestBody = {
  session_id?: string;
};

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-guest-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const logStep = (step: string, details?: unknown): void => {
  const detailsStr: string = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PAYMENT] ${step}${detailsStr}`);
};

/**
 * Order UUID was mistakenly used as `session_id` in some email / return URLs.
 * Regex must match `ORDER_UUID_PATTERN` in `src/lib/checkout/orderUuid.ts`.
 */
function looksLikeOrderUuid(value: string): boolean {
  const v = value.trim();
  if (!v || v.startsWith('cs_')) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    v
  );
}

async function buildInvoicePayloadFromOrder(
  supabase: SupabaseClient,
  orderData: OrderSelectRow,
  paymentMethod: string,
  stripeSessionIdForUi: string
): Promise<InvoicePayload> {
  const orderId: string = String(orderData.id ?? '');
  const { data: items } = await supabase
    .from('order_items')
    .select('product_id, quantity, unit_price, total_price, product_snapshot')
    .eq('order_id', orderId);
  const rows: OrderItemSelectRow[] = (items ?? []) as OrderItemSelectRow[];
  const mapped: InvoiceLineItem[] = rows.map((item: OrderItemSelectRow) =>
    mapOrderItemRowToInvoiceLine(item)
  );
  const itemsSubtotal: number = mapped.reduce(
    (sum: number, i: InvoiceLineItem) => sum + i.total_price,
    0
  );
  const orderTotal: number = (orderData.amount as number) || itemsSubtotal;
  const shipping: number = Math.max(0, orderTotal - itemsSubtotal);
  const shippingRaw: Record<string, unknown> | null | undefined =
    orderData.shipping_address ?? undefined;
  const shippingAddress: NormalizedShippingAddress | null = shippingRaw
    ? {
        line1: String(shippingRaw.address_line1 || shippingRaw.line1 || ''),
        line2: String(shippingRaw.address_line2 || shippingRaw.line2 || ''),
        city: String(shippingRaw.city || ''),
        postalCode: String(
          shippingRaw.postal_code || shippingRaw.postalCode || ''
        ),
        country: String(shippingRaw.country || 'FR'),
      }
    : null;
  return {
    items: mapped,
    subtotal: itemsSubtotal,
    shipping,
    total: orderTotal,
    shippingAddress,
    paymentMethod,
    currency: String(orderData.currency || 'EUR').toUpperCase(),
    stripeSessionId: stripeSessionIdForUi,
  };
}

serve(async (req: Request): Promise<Response> => {
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

  // Try to get authenticated user from request (for order association)
  let authenticatedUserId: string | null = null;
  try {
    if (bearerToken && !isInternalServiceCall) {
      const anonKey: string = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
      const anonClient: SupabaseClient = createClient(supabaseUrl, anonKey);
      const authResult = await anonClient.auth.getUser(bearerToken);
      const user: User | null = authResult.data.user;
      authenticatedUserId = user?.id ?? null;
      if (authenticatedUserId) {
        logStep('Authenticated user detected', { userId: authenticatedUserId });
      }
    }
  } catch {
    logStep('Could not extract user from auth header (non-fatal)');
  }

  try {
    logStep('Function started');

    const body: VerifyPaymentRequestBody =
      (await req.json()) as VerifyPaymentRequestBody;
    const session_id: string | undefined =
      typeof body.session_id === 'string' ? body.session_id : undefined;
    if (!session_id) {
      throw new Error('No session ID provided');
    }

    logStep('Verifying session', { sessionId: session_id });

    const isAuthorizedOrder: (
      order: OrderRowForAccess,
      sid: string
    ) => boolean = (order, sid) => {
      if (isInternalServiceCall) return true;
      if (!sid) return false;
      if (
        looksLikeOrderUuid(sid) &&
        typeof order?.id === 'string' &&
        order.id === sid
      ) {
        return true;
      }
      if (order?.stripe_session_id === sid) return true;
      const meta = (order?.metadata || {}) as Record<string, unknown>;
      if (meta.stripe_session_id === sid) return true;
      if (
        authenticatedUserId &&
        order?.user_id &&
        authenticatedUserId === order.user_id
      ) {
        return true;
      }
      const orderGuestId: string | null =
        typeof meta.guest_id === 'string' ? meta.guest_id : null;
      return !!(guestId && orderGuestId && guestId === orderGuestId);
    };

    const isOrderConfirmed: (order: OrderRowForAccess) => boolean = (order) => {
      const status: string = String(order?.status || '').toLowerCase();
      const orderStatus: string = String(
        order?.order_status || ''
      ).toLowerCase();
      const metadata: Record<string, unknown> = (order?.metadata ||
        {}) as Record<string, unknown>;

      return (
        status === 'paid' ||
        status === 'completed' ||
        orderStatus === 'paid' ||
        orderStatus === 'completed' ||
        metadata.webhook_processed === true ||
        metadata.webhook_processed === 'true'
      );
    };

    const selectOrderFields: string =
      'id, status, order_status, amount, currency, shipping_address, metadata, created_at, user_id, stripe_session_id';

    // Do not call Stripe with an order UUID — it throws and becomes a 500 for legacy email links.
    if (looksLikeOrderUuid(session_id)) {
      const { data: byPkRaw } = await supabaseService
        .from('orders')
        .select(selectOrderFields)
        .eq('id', session_id)
        .maybeSingle();
      const byPk: OrderSelectRow | null = byPkRaw as OrderSelectRow | null;

      if (!byPk) {
        logStep('UUID-shaped session_id: no matching order', { session_id });
        return new Response(
          JSON.stringify({
            success: false,
            processing: true,
            message:
              'Nous synchronisons votre commande. Si vous avez payé, un email de confirmation arrive sous peu.',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      if (!isAuthorizedOrder(byPk, session_id)) {
        logStep('UUID order lookup denied by ownership rules');
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Order not found',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404,
          }
        );
      }

      if (isOrderConfirmed(byPk)) {
        const stripeRef: string = String(byPk.stripe_session_id || '');
        const invoice: InvoicePayload = await buildInvoicePayloadFromOrder(
          supabaseService,
          byPk,
          'card',
          stripeRef
        );
        logStep('Order confirmed via UUID-shaped session_id (DB-only)', {
          orderId: byPk.id,
        });
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Commande confirmée',
            orderId: byPk.id,
            customerInfo: null,
            invoiceData: {
              ...invoice,
              date: byPk.created_at || new Date().toISOString(),
            },
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      logStep('Order found by UUID but not yet finalized in DB', {
        orderId: byPk.id,
      });
      return new Response(
        JSON.stringify({
          success: false,
          processing: true,
          message:
            'Paiement recu. Nous finalisons votre commande — vous recevrez la confirmation par email.',
          orderId: byPk.id,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    const findOrderBySession: (
      sessionIdValue: string,
      fallbackOrderId?: string
    ) => Promise<OrderSelectRow | null> = async (
      sessionIdValue: string,
      fallbackOrderId?: string
    ) => {
      const { data: bySessionRaw } = await supabaseService
        .from('orders')
        .select(selectOrderFields)
        .eq('stripe_session_id', sessionIdValue)
        .maybeSingle();
      const bySession: OrderSelectRow | null =
        bySessionRaw as OrderSelectRow | null;

      if (bySession) return bySession;

      const metaLookup = await supabaseService
        .from('orders')
        .select(selectOrderFields)
        .contains('metadata', { stripe_session_id: sessionIdValue })
        .maybeSingle();

      const byMetadata: OrderSelectRow | null =
        metaLookup.data && !metaLookup.error
          ? (metaLookup.data as OrderSelectRow)
          : null;

      if (byMetadata) return byMetadata;

      if (fallbackOrderId) {
        const { data: byOrderIdRaw } = await supabaseService
          .from('orders')
          .select(selectOrderFields)
          .eq('id', fallbackOrderId)
          .maybeSingle();
        const byOrderId: OrderSelectRow | null =
          byOrderIdRaw as OrderSelectRow | null;

        if (byOrderId) return byOrderId;
      }

      return null;
    };

    // DB-first path: if webhook already confirmed the order, don't block UX on Stripe API lookup.
    const preConfirmedOrder: OrderSelectRow | null =
      await findOrderBySession(session_id);
    if (preConfirmedOrder) {
      if (!isAuthorizedOrder(preConfirmedOrder, session_id)) {
        logStep('Order access denied by ownership rules');
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Order not found',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404,
          }
        );
      }
    }
    if (preConfirmedOrder && isOrderConfirmed(preConfirmedOrder)) {
      logStep('Order already confirmed in DB before Stripe lookup', {
        orderId: preConfirmedOrder.id,
      });

      const invEarly: InvoicePayload = await buildInvoicePayloadFromOrder(
        supabaseService,
        preConfirmedOrder,
        'card',
        String(preConfirmedOrder.stripe_session_id || session_id)
      );

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Commande confirmée',
          orderId: preConfirmedOrder.id,
          customerInfo: null,
          invoiceData: {
            ...invEarly,
            date: preConfirmedOrder.created_at || new Date().toISOString(),
          },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    if (!session_id.startsWith('cs_')) {
      if (looksLikeOrderUuid(session_id)) {
        logStep(
          'Non–Stripe session id (UUID) reached Stripe branch — DB-only',
          {
            session_id,
          }
        );
        const { data: orphanRaw } = await supabaseService
          .from('orders')
          .select(selectOrderFields)
          .eq('id', session_id.trim())
          .maybeSingle();
        const orphan: OrderSelectRow | null =
          orphanRaw as OrderSelectRow | null;
        if (orphan && isAuthorizedOrder(orphan, session_id)) {
          if (isOrderConfirmed(orphan)) {
            const stripeRefOr: string = String(orphan.stripe_session_id || '');
            const invOr: InvoicePayload = await buildInvoicePayloadFromOrder(
              supabaseService,
              orphan,
              'card',
              stripeRefOr || session_id
            );
            return new Response(
              JSON.stringify({
                success: true,
                message: 'Commande confirmée',
                orderId: orphan.id,
                customerInfo: null,
                invoiceData: {
                  ...invOr,
                  date: orphan.created_at || new Date().toISOString(),
                },
              }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
              }
            );
          }
          return new Response(
            JSON.stringify({
              success: false,
              processing: true,
              message:
                'Paiement recu. Nous finalisons votre commande — vous recevrez la confirmation par email.',
              orderId: orphan.id,
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            }
          );
        }
      }
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid Stripe Checkout session id',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    const stripeSecret: string = Deno.env.get('STRIPE_SECRET_KEY') || '';
    const stripe: Stripe = new Stripe(stripeSecret, {
      apiVersion: '2025-08-27.basil',
    });

    let session: Stripe.Checkout.Session;

    try {
      session = await stripe.checkout.sessions.retrieve(session_id, {
        expand: ['customer', 'payment_intent'],
      });
    } catch (stripeErr: unknown) {
      logStep('Stripe lookup failed, retrying via DB-only confirmation path', {
        message:
          stripeErr instanceof Error ? stripeErr.message : String(stripeErr),
      });

      const recoveredOrder: OrderSelectRow | null =
        await findOrderBySession(session_id);
      if (recoveredOrder) {
        if (!isAuthorizedOrder(recoveredOrder, session_id)) {
          logStep('Recovered order denied by ownership rules');
          return new Response(
            JSON.stringify({
              success: false,
              message: 'Order not found',
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 404,
            }
          );
        }
      }
      if (recoveredOrder && isOrderConfirmed(recoveredOrder)) {
        const invRec: InvoicePayload = await buildInvoicePayloadFromOrder(
          supabaseService,
          recoveredOrder,
          'card',
          String(recoveredOrder.stripe_session_id || session_id)
        );
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Commande confirmée',
            orderId: recoveredOrder.id,
            customerInfo: null,
            invoiceData: {
              ...invRec,
              date: recoveredOrder.created_at || new Date().toISOString(),
            },
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      throw stripeErr;
    }

    if (!session) {
      throw new Error('Session not found');
    }

    const stripeMetadataOrderId: string | undefined =
      session.metadata?.order_id;

    logStep('Session retrieved', {
      paymentStatus: session.payment_status,
      orderId: stripeMetadataOrderId,
    });

    if (session.payment_status !== 'paid') {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Payment not completed',
          status: session.payment_status,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    const buildStripeSessionSummary: (
      checkoutSessionId: string
    ) => Promise<StripeSessionSummaryPayload> = async (
      checkoutSessionId: string
    ) => {
      let items: StripeSummaryLine[] = [];

      try {
        const lineItems: Stripe.Response<Stripe.ApiList<Stripe.LineItem>> =
          await stripe.checkout.sessions.listLineItems(checkoutSessionId, {
            limit: 20,
          });
        const lineData: Stripe.LineItem[] = lineItems.data ?? [];
        items = lineData.map((item: Stripe.LineItem) => ({
          name: item.description || 'Produit',
          quantity: item.quantity || 1,
          total: (item.amount_total || 0) / 100,
        }));
      } catch (lineItemErr: unknown) {
        logStep('Could not fetch Stripe line items (non-fatal)', {
          message:
            lineItemErr instanceof Error
              ? lineItemErr.message
              : String(lineItemErr),
        });
      }

      const customerEmail: string | null =
        session.customer_details?.email ?? null;
      const amountTotal: number = (session.amount_total || 0) / 100;
      const currencyCode: string = (session.currency || 'eur').toUpperCase();

      return {
        session_id: checkoutSessionId,
        customer_email: customerEmail,
        amount_total: amountTotal,
        currency: currencyCode,
        payment_status: session.payment_status,
        items,
      };
    };

    // Find order by stripe_session_id, metadata.stripe_session_id, then Stripe metadata order_id.
    const orderData: OrderSelectRow | null = await findOrderBySession(
      session_id,
      stripeMetadataOrderId
    );

    if (!orderData) {
      logStep('Order not found after Stripe verification', {
        sessionId: session_id,
        fallbackOrderId: stripeMetadataOrderId,
      });
      return new Response(
        JSON.stringify({
          success: false,
          processing: true,
          message:
            'Paiement reçu. La commande est en cours de synchronisation avec notre système.',
          stripe_session_summary: await buildStripeSessionSummary(session_id),
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    if (!isAuthorizedOrder(orderData, session_id)) {
      logStep('Order access denied by ownership rules');
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Order not found',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    logStep('Order found', {
      orderId: orderData.id,
      status: orderData.status,
      order_status: orderData.order_status,
    });

    // ========================================================================
    // ASSOCIATE ORDER WITH AUTHENTICATED USER (if user_id is null)
    // This handles cases where the order was created from a context without auth
    // (e.g., iframe preview opening Stripe in a new tab)
    // ========================================================================
    if (!orderData.user_id && authenticatedUserId) {
      const assocResult = await supabaseService
        .from('orders')
        .update({ user_id: authenticatedUserId })
        .eq('id', orderData.id)
        .is('user_id', null);

      const assocError: PostgrestError | null = assocResult.error;

      if (!assocError) {
        logStep('Order associated with authenticated user', {
          orderId: orderData.id,
          userId: authenticatedUserId,
        });
      } else {
        logStep('Failed to associate order (non-fatal)', {
          error: assocError.message,
        });
      }
    }

    // Helper: fetch order items for invoice
    const fetchOrderItems: (oid: string) => Promise<InvoiceLineItem[]> = async (
      oid: string
    ) => {
      const { data: items } = await supabaseService
        .from('order_items')
        .select(
          'product_id, quantity, unit_price, total_price, product_snapshot'
        )
        .eq('order_id', oid);
      const rows: OrderItemSelectRow[] = (items ?? []) as OrderItemSelectRow[];
      return rows.map((item: OrderItemSelectRow) =>
        mapOrderItemRowToInvoiceLine(item)
      );
    };

    const buildInvoiceData: (oid: string) => Promise<InvoicePayload> = async (
      oid: string
    ) => {
      const orderItems: InvoiceLineItem[] = await fetchOrderItems(oid);
      const itemsSubtotal: number = orderItems.reduce(
        (sum: number, i: InvoiceLineItem) => sum + i.total_price,
        0
      );
      const orderTotal: number = orderData.amount || itemsSubtotal;
      const shipping: number = Math.max(0, orderTotal - itemsSubtotal);
      const shippingAddr: Record<string, unknown> | null | undefined =
        orderData.shipping_address ?? undefined;
      const shippingAddress: NormalizedShippingAddress | null = shippingAddr
        ? {
            line1: String(
              shippingAddr.address_line1 || shippingAddr.line1 || ''
            ),
            line2: String(
              shippingAddr.address_line2 || shippingAddr.line2 || ''
            ),
            city: String(shippingAddr.city || ''),
            postalCode: String(
              shippingAddr.postal_code || shippingAddr.postalCode || ''
            ),
            country: String(shippingAddr.country || 'FR'),
          }
        : null;
      const paymentMethod: string = session.payment_method_types?.[0] || 'card';
      const currency: string = orderData.currency?.toUpperCase() || 'EUR';
      return {
        items: orderItems,
        subtotal: itemsSubtotal,
        shipping,
        total: orderTotal,
        shippingAddress,
        paymentMethod,
        currency,
        stripeSessionId: session_id,
      };
    };

    // ========================================================================
    // CASE 1: Already processed (by webhook or previous verify call)
    // ========================================================================
    if (isOrderConfirmed(orderData)) {
      logStep('Order already processed — returning current status', {
        orderId: orderData.id,
      });
      const orderPk: string = String(orderData.id ?? '');
      const invoice: InvoicePayload = await buildInvoiceData(orderPk);
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Commande confirmée',
          orderId: orderData.id,
          customerInfo: session.customer_details
            ? {
                firstName: session.customer_details.name?.split(' ')[0] || '',
                lastName:
                  session.customer_details.name
                    ?.split(' ')
                    .slice(1)
                    .join(' ') || '',
                email: session.customer_details.email || '',
              }
            : null,
          invoiceData: {
            ...invoice,
            date: orderData.created_at || new Date().toISOString(),
          },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // ========================================================================
    // CASE 2: Order exists but webhook hasn't finalized status yet.
    // verify-payment is now READ-ONLY: webhook remains the source of truth.
    // ========================================================================
    logStep('Order found but not yet finalized by webhook', {
      orderId: orderData.id,
      status: orderData.status,
      orderStatus: orderData.order_status,
    });

    return new Response(
      JSON.stringify({
        success: false,
        processing: true,
        message:
          'Paiement recu. Nous finalisons votre commande et vous enverrons la confirmation rapidement.',
        orderId: orderData.id,
        stripe_session_summary: await buildStripeSessionSummary(session_id),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage: string =
      error instanceof Error ? error.message : String(error);
    logStep('ERROR in verify-payment', { message: errorMessage });
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
