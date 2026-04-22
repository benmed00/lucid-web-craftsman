/**
 * sign-order-token — issues a 15-minute HMAC token for order-confirmation page access.
 *
 * No auth required: the order_id UUID is itself unguessable, and the token
 * is short-lived. Returns 404 if order doesn't exist (avoids token-as-oracle).
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { signOrderToken } from '../_shared/invoice/token.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS')
    return new Response(null, { headers: corsHeaders });

  try {
    const { order_id } = await req.json();
    if (!order_id || typeof order_id !== 'string') {
      return json({ error: 'Missing order_id' }, 400);
    }

    const { data: order, error } = await admin
      .from('orders')
      .select('id, status, order_status')
      .eq('id', order_id)
      .maybeSingle();

    if (error) {
      console.error(
        JSON.stringify({
          fn: 'sign-order-token',
          step: 'db_query',
          order_id,
          reason: error.message,
        })
      );
      return json({ error: 'Database error' }, 500);
    }
    if (!order) {
      console.warn(
        JSON.stringify({
          fn: 'sign-order-token',
          step: 'lookup',
          order_id,
          reason: 'not_found',
        })
      );
      return json({ error: 'Order not found' }, 404);
    }

    // Only issue tokens for orders that have actually been paid / progressed.
    const ALLOWED = new Set([
      'paid',
      'processing',
      'completed',
      'shipped',
      'delivered',
    ]);
    const status = (order.status || '').toLowerCase();
    const orderStatus = (order.order_status || '').toLowerCase();
    if (!ALLOWED.has(status) && !ALLOWED.has(orderStatus)) {
      console.warn(
        JSON.stringify({
          fn: 'sign-order-token',
          step: 'status_gate',
          order_id,
          reason: 'order_not_paid',
          status,
          order_status: orderStatus,
        })
      );
      return json({ error: 'Order not ready' }, 409);
    }

    const token = await signOrderToken(order_id);
    return json({ token });
  } catch (err) {
    console.error('[sign-order-token]', err);
    return json({ error: err.message || 'Failed' }, 500);
  }
});
