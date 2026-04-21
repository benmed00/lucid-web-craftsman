/**
 * get-order-by-token — returns full order + order_items for a valid order_access token.
 *
 * Strict: 401 on bad/expired/wrong-type token, 404 if order missing, 500 on DB error.
 * No fallbacks, no synthetic data.
 */
// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyTokenPayload } from '../_shared/invoice/token.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { token } = await req.json();
    if (!token || typeof token !== 'string') {
      return json({ error: 'Missing token' }, 400);
    }

    let payload;
    try {
      payload = await verifyTokenPayload(token);
    } catch (e) {
      console.warn('[get-order-by-token] invalid token:', e.message);
      return json({ error: 'Invalid or expired token' }, 401);
    }

    if (payload.type !== 'order_access') {
      return json({ error: 'Wrong token type' }, 401);
    }
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return json({ error: 'Token expired' }, 401);
    }

    const orderId = payload.order_id;

    const { data: order, error: orderErr } = await admin
      .from('orders')
      .select('id, status, order_status, amount, currency, created_at, shipping_address, metadata, payment_method, user_id')
      .eq('id', orderId)
      .maybeSingle();

    if (orderErr) {
      console.error('[get-order-by-token] order query error', orderErr);
      return json({ error: 'Database error' }, 500);
    }
    if (!order) return json({ error: 'Order not found' }, 404);

    const { data: items, error: itemsErr } = await admin
      .from('order_items')
      .select('quantity, unit_price, total_price, product_snapshot, product_id')
      .eq('order_id', orderId);

    if (itemsErr) {
      console.error('[get-order-by-token] items query error', itemsErr);
      return json({ error: 'Database error' }, 500);
    }

    return json({ order, items: items || [] });
  } catch (err) {
    console.error('[get-order-by-token]', err);
    return json({ error: err.message || 'Failed' }, 500);
  }
});
