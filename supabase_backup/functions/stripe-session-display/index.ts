/**
 * stripe-session-display
 *
 * Read-only Stripe Checkout session snapshot for post-payment UX.
 * Does not read or write the database and does not infer order status.
 * The checkout session id from the success URL acts as the capability token.
 */
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@18.5.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-SESSION-DISPLAY] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let body: { session_id?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid JSON' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const session_id = body?.session_id?.trim();
    if (!session_id) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing session_id' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2025-08-27.basil',
    });

    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['customer', 'payment_intent'],
    });

    let items: Array<{ name: string; quantity: number; total: number }> = [];
    try {
      const lineItems = await stripe.checkout.sessions.listLineItems(
        session_id,
        {
          limit: 20,
        }
      );
      items = (lineItems.data || []).map((item: Stripe.LineItem) => ({
        name: item.description || 'Produit',
        quantity: item.quantity || 1,
        total: (item.amount_total || 0) / 100,
      }));
    } catch (e) {
      logStep('Line items fetch failed (non-fatal)', {
        message: (e as Error).message,
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        session_id,
        payment_status: session.payment_status,
        customer_email: session.customer_details?.email || null,
        amount_total: (session.amount_total || 0) / 100,
        currency: (session.currency || 'eur').toUpperCase(),
        items,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep('ERROR', { message: msg });
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
