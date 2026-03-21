/**
 * verify-payment Edge Function
 *
 * READ-ONLY verification: checks Stripe session status and returns order info.
 * All MUTATIONS (stock, payment records, status updates) are handled by the
 * stripe-webhook Edge Function which is the AUTHORITATIVE source of truth.
 *
 * This function is called from PaymentSuccess.tsx when the user returns from Stripe.
 * If the webhook already processed the order, it returns the current status.
 * If the webhook hasn't fired yet, it returns a processing payload so the UI
 * can reassure the customer without mutating order state client-side.
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
  console.log(`[VERIFY-PAYMENT] ${step}${detailsStr}`);
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

  // Try to get authenticated user from request (for order association)
  let authenticatedUserId: string | null = null;
  try {
    if (bearerToken && !isInternalServiceCall) {
      const anonClient = createClient(
        supabaseUrl,
        Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      );
      const {
        data: { user },
      } = await anonClient.auth.getUser(bearerToken);
      authenticatedUserId = user?.id || null;
      if (authenticatedUserId) {
        logStep('Authenticated user detected', { userId: authenticatedUserId });
      }
    }
  } catch {
    logStep('Could not extract user from auth header (non-fatal)');
  }

  try {
    logStep('Function started');

    const { session_id } = await req.json();
    if (!session_id) {
      throw new Error('No session ID provided');
    }

    logStep('Verifying session', { sessionId: session_id });

    const selectOrderFields =
      'id, status, order_status, amount, currency, shipping_address, metadata, created_at, user_id';

    const isOrderConfirmed = (order: any): boolean => {
      const status = String(order?.status || '').toLowerCase();
      const orderStatus = String(order?.order_status || '').toLowerCase();
      const metadata = (order?.metadata || {}) as Record<string, unknown>;

      return (
        status === 'paid' ||
        status === 'completed' ||
        orderStatus === 'paid' ||
        orderStatus === 'completed' ||
        metadata.webhook_processed === true ||
        metadata.webhook_processed === 'true'
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

    // DB-first path: if webhook already confirmed the order, don't block UX on Stripe API lookup.
    const preConfirmedOrder = await findOrderBySession(session_id);
    if (preConfirmedOrder) {
      if (!isAuthorizedOrder(preConfirmedOrder)) {
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

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2025-08-27.basil',
    });

    let session: Stripe.Checkout.Session;

    try {
      session = await stripe.checkout.sessions.retrieve(session_id, {
        expand: ['customer', 'payment_intent'],
      });
    } catch (stripeErr) {
      logStep('Stripe lookup failed, retrying via DB-only confirmation path', {
        message: (stripeErr as Error).message,
      });

      const recoveredOrder = await findOrderBySession(session_id);
      if (recoveredOrder) {
        if (!isAuthorizedOrder(recoveredOrder)) {
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
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Commande confirmée',
            orderId: recoveredOrder.id,
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

    logStep('Session retrieved', {
      paymentStatus: session.payment_status,
      orderId: session.metadata?.order_id,
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

    const buildStripeSessionSummary = async (checkoutSessionId: string) => {
      let items: Array<{
        name: string;
        quantity: number;
        total: number;
      }> = [];

      try {
        const lineItems = await stripe.checkout.sessions.listLineItems(
          checkoutSessionId,
          { limit: 20 }
        );
        items = (lineItems.data || []).map((item) => ({
          name: item.description || 'Produit',
          quantity: item.quantity || 1,
          total: (item.amount_total || 0) / 100,
        }));
      } catch (lineItemErr) {
        logStep('Could not fetch Stripe line items (non-fatal)', {
          message: (lineItemErr as Error).message,
        });
      }

      return {
        session_id: checkoutSessionId,
        customer_email: session.customer_details?.email || null,
        amount_total: (session.amount_total || 0) / 100,
        currency: (session.currency || 'eur').toUpperCase(),
        payment_status: session.payment_status,
        items,
      };
    };

    // Find order by stripe_session_id, metadata.stripe_session_id, then Stripe metadata order_id.
    const orderData = await findOrderBySession(
      session_id,
      session.metadata?.order_id
    );

    if (!orderData) {
      logStep('Order not found after Stripe verification', {
        sessionId: session_id,
        fallbackOrderId: session.metadata?.order_id,
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

    if (!isAuthorizedOrder(orderData)) {
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
      const { error: assocError } = await supabaseService
        .from('orders')
        .update({ user_id: authenticatedUserId })
        .eq('id', orderData.id)
        .is('user_id', null);

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
    const fetchOrderItems = async (oid: string) => {
      const { data: items } = await supabaseService
        .from('order_items')
        .select('quantity, unit_price, total_price, product_snapshot')
        .eq('order_id', oid);
      return (items || []).map((item) => {
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
      const itemsSubtotal = orderItems.reduce(
        (sum: number, i: any) => sum + i.total_price,
        0
      );
      const orderTotal = orderData.amount || itemsSubtotal;
      const shipping = Math.max(0, orderTotal - itemsSubtotal);
      const shippingAddr = orderData.shipping_address as any;
      return {
        items: orderItems,
        subtotal: itemsSubtotal,
        shipping,
        total: orderTotal,
        shippingAddress: shippingAddr
          ? {
              line1: shippingAddr.address_line1 || shippingAddr.line1 || '',
              line2: shippingAddr.address_line2 || shippingAddr.line2 || '',
              city: shippingAddr.city || '',
              postalCode:
                shippingAddr.postal_code || shippingAddr.postalCode || '',
              country: shippingAddr.country || 'FR',
            }
          : null,
        paymentMethod: session.payment_method_types?.[0] || 'card',
        currency: orderData.currency?.toUpperCase() || 'EUR',
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
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
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

  function isAuthorizedOrder(order: any): boolean {
    if (isInternalServiceCall) return true;
    if (
      authenticatedUserId &&
      order?.user_id &&
      authenticatedUserId === order.user_id
    ) {
      return true;
    }
    if (authenticatedUserId && !order?.user_id) {
      // Resilience path for legacy orders created without user_id.
      return true;
    }
    const metadata = (order?.metadata || {}) as Record<string, unknown>;
    const orderGuestId =
      typeof metadata.guest_id === 'string' ? metadata.guest_id : null;
    return !!(guestId && orderGuestId && guestId === orderGuestId);
  }
});
