import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const tokenSecret =
  Deno.env.get('ORDER_CONFIRMATION_TOKEN_SECRET') || serviceRoleKey;

const logStep = (step: string, details?: unknown) => {
  const suffix = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ORDER-CONFIRMATION-LOOKUP] ${step}${suffix}`);
};

const normalizeBase64Url = (input: string): string => {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const remainder = normalized.length % 4;
  if (remainder === 0) return normalized;
  return normalized + '='.repeat(4 - remainder);
};

const decodeBase64Url = (input: string): string => {
  const binary = atob(normalizeBase64Url(input));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

const bytesToBase64Url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const hmacSha256Base64Url = async (
  value: string,
  secret: string
): Promise<string> => {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(value)
  );
  return bytesToBase64Url(new Uint8Array(signature));
};

interface ParsedToken {
  oid: string;
  em: string;
  exp: number;
}

const parseAndVerifyToken = async (
  token: string,
  orderId: string
): Promise<ParsedToken | null> => {
  const [payloadPart, signaturePart] = token.split('.');
  if (!payloadPart || !signaturePart) return null;

  const expectedSignature = await hmacSha256Base64Url(payloadPart, tokenSecret);
  if (expectedSignature !== signaturePart) return null;

  const parsed = JSON.parse(decodeBase64Url(payloadPart)) as ParsedToken;
  if (!parsed?.oid || !parsed?.em || !parsed?.exp) return null;
  if (parsed.oid !== orderId) return null;
  if (Date.now() > parsed.exp) return null;
  return parsed;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { order_id, token } = await req.json();
    if (!order_id || !token) {
      return new Response(
        JSON.stringify({ found: false, error: 'Missing order_id or token' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    const parsedToken = await parseAndVerifyToken(String(token), String(order_id));
    if (!parsedToken) {
      return new Response(
        JSON.stringify({ found: false, error: 'Invalid or expired token' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(
        'id, status, order_status, amount, currency, created_at, shipping_address, metadata'
      )
      .eq('id', order_id)
      .maybeSingle();

    if (orderError || !order) {
      logStep('Order not found', { orderId: order_id, error: orderError?.message });
      return new Response(JSON.stringify({ found: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const shippingAddress = (order.shipping_address || {}) as Record<
      string,
      unknown
    >;
    const metadata = (order.metadata || {}) as Record<string, unknown>;
    const orderEmail =
      (shippingAddress.email as string) ||
      (metadata.customer_email as string) ||
      null;

    if (
      orderEmail &&
      orderEmail.toLowerCase().trim() !== parsedToken.em.toLowerCase().trim()
    ) {
      return new Response(JSON.stringify({ found: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const { data: orderItems } = await supabase
      .from('order_items')
      .select('quantity, unit_price, total_price, product_snapshot')
      .eq('order_id', order.id);

    const items = (orderItems || []).map((item) => {
      const snapshot = (item.product_snapshot || {}) as Record<string, unknown>;
      return {
        product_name: (snapshot.name as string) || 'Produit',
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      };
    });

    const normalizedStatus = String(order.status || '').toLowerCase();
    const normalizedOrderStatus = String(order.order_status || '').toLowerCase();
    const isPaid =
      normalizedStatus === 'paid' ||
      normalizedStatus === 'completed' ||
      normalizedOrderStatus === 'paid' ||
      normalizedOrderStatus === 'completed';

    return new Response(
      JSON.stringify({
        found: true,
        order_id: order.id,
        status: order.status,
        order_status: order.order_status,
        is_paid: isPaid,
        amount: order.amount,
        currency: order.currency,
        created_at: order.created_at,
        customer_email: orderEmail,
        items,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep('Unhandled error', { message });
    return new Response(JSON.stringify({ found: false, error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
