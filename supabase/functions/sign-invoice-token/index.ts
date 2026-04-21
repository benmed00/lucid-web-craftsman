/**
 * sign-invoice-token — issues a 30-day HMAC token for invoice access.
 *
 * Caller must own the order (authenticated) OR provide matching x-guest-id.
 * Used by: order-confirmation page (frontend) and email templates (server-side).
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { signToken } from '../_shared/invoice/token.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-guest-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
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
    if (!order_id) return json({ error: 'Missing order_id' }, 400);

    const { data: order } = await admin
      .from('orders')
      .select('user_id, metadata')
      .eq('id', order_id)
      .maybeSingle();

    if (!order) return json({ error: 'Order not found' }, 404);

    let authorized = false;

    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const {
        data: { user },
      } = await userClient.auth.getUser();
      if (user) {
        if (order.user_id === user.id) authorized = true;
        else {
          const { data: isAdmin } = await admin.rpc('is_admin_user', {
            _user_id: user.id,
          });
          if (isAdmin) authorized = true;
        }
      }
    }

    if (!authorized) {
      const guestId = req.headers.get('x-guest-id');
      const orderGuestId = (order.metadata as any)?.guest_id;
      if (guestId && orderGuestId && guestId === orderGuestId)
        authorized = true;
    }

    if (!authorized) return json({ error: 'Unauthorized' }, 401);

    const token = await signToken(order_id);
    return json({ token });
  } catch (err) {
    console.error('[sign-invoice-token]', err);
    return json({ error: err.message || 'Failed' }, 500);
  }
});
