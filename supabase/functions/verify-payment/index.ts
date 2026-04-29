/**
 * verify-payment Edge Function
 *
 * Called when user returns from Stripe. Uses CENTRALIZED confirmOrderFromStripe
 * as fallback if webhook hasn't fired yet.
 *
 * Flow:
 * 1. DB-first: check if order already confirmed
 * 2. If not, verify with Stripe API
 * 3. If Stripe says paid, use confirmOrderFromStripe (same as webhook)
 * 4. Return order data + invoice info
 */
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@18.5.0';
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import {
  confirmOrderFromStripe,
  orderItemsForConfirmationEmail,
  sendConfirmationEmail,
} from '../_shared/confirm-order.ts';
import type { Database, Json } from '../_shared/database.types.ts';
import { jsonToRecord } from '../_shared/json-helpers.ts';
import {
  authoritativeTotalMajor,
  authoritativeTotalMinor,
} from '../_shared/order-money.ts';

type DbClient = SupabaseClient<Database>;

/** Minimal order shape returned by `findOrderBySession` selects. */
type OrderForVerify = Pick<
  Database['public']['Tables']['orders']['Row'],
  | 'id'
  | 'status'
  | 'order_status'
  | 'amount'
  | 'total_amount'
  | 'currency'
  | 'shipping_address'
  | 'metadata'
  | 'created_at'
  | 'user_id'
>;

type OrderItemRow = Pick<
  Database['public']['Tables']['order_items']['Row'],
  'quantity' | 'unit_price' | 'total_price' | 'product_snapshot'
>;

function productTitleFromSnapshot(snapshot: Json | null): string {
  const r = jsonToRecord(snapshot);
  const n = r.name ?? r.title;
  return typeof n === 'string' ? n : 'Product';
}

function shippingField(addr: Record<string, Json>, ...keys: string[]): string {
  for (const k of keys) {
    const v = addr[k];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return '';
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-guest-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabaseService: DbClient = createClient<Database>(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: { persistSession: false },
    }
  );
  const authHeader = req.headers.get('Authorization');
  const bearerToken = authHeader?.startsWith('Bearer ')
    ? authHeader.replace('Bearer ', '')
    : null;
  const guestId = req.headers.get('x-guest-id')?.trim() || null;
  const isInternalServiceCall = !!bearerToken && bearerToken === serviceRoleKey;

  // Get authenticated user
  let authenticatedUserId: string | null = null;
  try {
    if (bearerToken && !isInternalServiceCall) {
      const anonClient = createClient<Database>(
        supabaseUrl,
        Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      );
      const {
        data: { user },
      } = await anonClient.auth.getUser(bearerToken);
      authenticatedUserId = user?.id || null;
      if (authenticatedUserId)
        logStep('Authenticated user detected', { userId: authenticatedUserId });
    }
  } catch {
    logStep('Could not extract user from auth header (non-fatal)');
  }

  function isAuthorizedOrder(order: OrderForVerify): boolean {
    if (isInternalServiceCall) return true;
    if (
      authenticatedUserId &&
      order?.user_id &&
      authenticatedUserId === order.user_id
    )
      return true;
    const meta = jsonToRecord(order.metadata);
    const orderGuestId =
      typeof meta.guest_id === 'string' ? meta.guest_id : null;
    return !!(guestId && orderGuestId && guestId === orderGuestId);
  }

  try {
    logStep('Function started');

    const { session_id } = await req.json();
    if (!session_id) throw new Error('No session ID provided');

    logStep('Verifying session', { sessionId: session_id });

    const selectOrderFields =
      'id, status, order_status, amount, total_amount, currency, shipping_address, metadata, created_at, user_id';

    const isOrderConfirmed = (order: OrderForVerify): boolean => {
      const status = String(order?.status || '').toLowerCase();
      const orderStatus = String(order?.order_status || '').toLowerCase();
      const metadata = jsonToRecord(order.metadata);
      const wp = metadata.webhook_processed;
      return (
        status === 'paid' ||
        status === 'completed' ||
        orderStatus === 'paid' ||
        orderStatus === 'completed' ||
        wp === true ||
        wp === 'true'
      );
    };

    const findOrderBySession = async (
      sessionIdValue: string,
      fallbackOrderId?: string
    ) => {
      const { data: bySession } = await supabaseService
        .from('orders')
        .select(selectOrderFields)
        .eq('stripe_session_id', sessionIdValue)
        .maybeSingle();
      if (bySession) return bySession;

      const { data: byMetadata } = await supabaseService
        .from('orders')
        .select(selectOrderFields)
        .contains('metadata', { stripe_session_id: sessionIdValue })
        .maybeSingle();
      if (byMetadata) return byMetadata;

      if (fallbackOrderId) {
        const { data: byOrderId } = await supabaseService
          .from('orders')
          .select(selectOrderFields)
          .eq('id', fallbackOrderId)
          .maybeSingle();
        if (byOrderId) return byOrderId;
      }
      return null;
    };

    // ================================================================
    // DB-first: fast path if webhook already confirmed
    // ================================================================
    const preConfirmedOrder = await findOrderBySession(session_id);
    if (preConfirmedOrder && !isAuthorizedOrder(preConfirmedOrder)) {
      return new Response(
        JSON.stringify({ success: false, message: 'Order not found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }
    if (preConfirmedOrder && isOrderConfirmed(preConfirmedOrder)) {
      logStep('Order already confirmed in DB', {
        orderId: preConfirmedOrder.id,
      });
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Commande confirmée',
          orderId: preConfirmedOrder.id,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // ================================================================
    // Stripe lookup
    // ================================================================
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2025-08-27.basil',
    });

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.retrieve(session_id, {
        expand: ['customer', 'payment_intent'],
      });
    } catch (stripeErr) {
      logStep('Stripe lookup failed, trying DB-only', {
        message: (stripeErr as Error).message,
      });
      const recovered = await findOrderBySession(session_id);
      if (recovered && !isAuthorizedOrder(recovered)) {
        return new Response(
          JSON.stringify({ success: false, message: 'Order not found' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404,
          }
        );
      }
      if (recovered && isOrderConfirmed(recovered)) {
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Commande confirmée',
            orderId: recovered.id,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }
      throw stripeErr;
    }

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

    const orderData = await findOrderBySession(
      session_id,
      session.metadata?.order_id
    );
    if (!orderData) throw new Error('Order not found');
    if (!isAuthorizedOrder(orderData)) {
      return new Response(
        JSON.stringify({ success: false, message: 'Order not found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    logStep('Order found', { orderId: orderData.id, status: orderData.status });

    // Associate with authenticated user if needed
    if (!orderData.user_id && authenticatedUserId) {
      await supabaseService
        .from('orders')
        .update({ user_id: authenticatedUserId })
        .eq('id', orderData.id)
        .is('user_id', null);
      logStep('Order associated with user', {
        orderId: orderData.id,
        userId: authenticatedUserId,
      });
    }

    // Helper: build invoice data
    const buildInvoiceData = async (oid: string) => {
      const { data: items } = await supabaseService
        .from('order_items')
        .select('quantity, unit_price, total_price, product_snapshot')
        .eq('order_id', oid);

      const orderItems = (items ?? []).map((item: OrderItemRow) => ({
        product_name: productTitleFromSnapshot(item.product_snapshot),
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }));

      const itemsSubtotal = orderItems.reduce(
        (sum, i) => sum + Number(i.total_price ?? 0),
        0
      );
      const orderTotalMinor = authoritativeTotalMinor({
        total_amount: orderData.total_amount ?? null,
        amount: orderData.amount ?? null,
      });
      const shipping = Math.max(0, orderTotalMinor - itemsSubtotal);
      const shipJson = jsonToRecord(orderData.shipping_address);

      return {
        items: orderItems,
        subtotal: itemsSubtotal,
        shipping,
        total: orderTotalMinor,
        shippingAddress:
          Object.keys(shipJson).length > 0
            ? {
                line1: shippingField(
                  shipJson,
                  'address_line1',
                  'line1',
                  'address'
                ),
                line2: shippingField(shipJson, 'address_line2', 'line2'),
                city: shippingField(shipJson, 'city'),
                postalCode: shippingField(
                  shipJson,
                  'postal_code',
                  'postalCode'
                ),
                country: shippingField(shipJson, 'country') || 'FR',
              }
            : null,
        paymentMethod: session.payment_method_types?.[0] || 'card',
        currency: orderData.currency?.toUpperCase() || 'EUR',
        stripeSessionId: session_id,
      };
    };

    // ================================================================
    // CASE 1: Already confirmed
    // ================================================================
    if (orderData.status === 'paid' || orderData.status === 'completed') {
      logStep('Already processed, returning data', { orderId: orderData.id });
      const invoice = await buildInvoiceData(orderData.id);
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

    // ================================================================
    // CASE 2: Webhook hasn't fired — CENTRALIZED fallback confirmation
    // ================================================================
    logStep("Webhook hasn't processed yet — performing fallback confirmation");

    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id;

    const sessionCorr =
      typeof session.metadata?.correlation_id === 'string'
        ? session.metadata.correlation_id
        : undefined;
    const dbCorr = jsonToRecord(orderData.metadata).correlation_id;
    const correlationId =
      sessionCorr ?? (typeof dbCorr === 'string' ? dbCorr : undefined);

    const result = await confirmOrderFromStripe(supabaseService, {
      orderId: orderData.id,
      stripeSessionId: session_id,
      paymentIntentId,
      paymentMethod: session.payment_method_types?.[0] || 'card',
      correlationId,
      discountCode: session.metadata?.discount_code,
      source: 'verify_payment',
      customerEmail: session.customer_details?.email,
      customerName: session.customer_details?.name,
      stripe,
      session,
    });

    if (!result.confirmed && !result.alreadyProcessed) {
      throw new Error(result.error || 'Failed to confirm order');
    }

    logStep('Order confirmed via fallback', {
      orderId: orderData.id,
      alreadyProcessed: result.alreadyProcessed,
    });

    // Send email if we did the confirmation
    if (!result.alreadyProcessed) {
      const customerEmail = session.customer_details?.email;
      if (customerEmail) {
        const { data: freshOrder } = await supabaseService
          .from('orders')
          .select(
            'order_items(id, product_id, quantity, unit_price), amount, total_amount, currency, shipping_address'
          )
          .eq('id', orderData.id)
          .single();

        if (freshOrder) {
          await sendConfirmationEmail(supabaseService, {
            orderId: orderData.id,
            customerEmail,
            customerName: session.customer_details?.name || 'Client',
            orderItems: orderItemsForConfirmationEmail(freshOrder.order_items),
            orderAmount: authoritativeTotalMinor({
              total_amount: freshOrder.total_amount,
              amount: freshOrder.amount,
            }),
            currency: freshOrder.currency ?? 'eur',
            shippingAddress: freshOrder.shipping_address,
            source: 'verify_payment',
          });
        }
      }

      // Fraud detection
      try {
        let isFirstOrder = true;
        const metaUser = jsonToRecord(orderData.metadata).user_id;
        if (typeof metaUser === 'string') {
          const { count } = await supabaseService
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', metaUser)
            .neq('id', orderData.id)
            .eq('status', 'paid');
          isFirstOrder = (count || 0) === 0;
        }
        await supabaseService.rpc('calculate_fraud_score', {
          p_order_id: orderData.id,
          p_customer_email: session.customer_details?.email || '',
          p_shipping_address:
            orderData.shipping_address === null
              ? ({} as Json)
              : (orderData.shipping_address as Json),
          p_billing_address:
            orderData.shipping_address === null
              ? ({} as Json)
              : (orderData.shipping_address as Json),
          p_is_first_order: isFirstOrder,
          p_order_amount: authoritativeTotalMajor({
            total_amount: orderData.total_amount ?? null,
            amount: orderData.amount ?? null,
          }),
        });
      } catch (fraudErr) {
        logStep('Fraud detection error (non-fatal)', {
          error: (fraudErr as Error).message,
        });
      }
    }

    const invoice = await buildInvoiceData(orderData.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Commande confirmée',
        orderId: orderData.id,
        customerInfo: session.customer_details
          ? {
              firstName: session.customer_details.name?.split(' ')[0] || '',
              lastName:
                session.customer_details.name?.split(' ').slice(1).join(' ') ||
                '',
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
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('ERROR in verify-payment', { message: errorMessage });
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
