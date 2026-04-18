/**
 * generate-invoice — Backend-driven, deterministic invoice generation.
 *
 * Auth: signed token (HMAC-SHA256) OR authenticated owner OR admin OR matching guest_id header.
 * Idempotent: returns existing snapshot on subsequent calls.
 * Storage: HTML persisted in `invoices` table; signed Storage URL future-ready.
 */
// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyToken } from '../_shared/invoice/token.ts';
import { validateInvoice, InvoiceValidationError } from '../_shared/invoice/validate.ts';
import { renderInvoiceHTML } from '../_shared/invoice/render.ts';
import type { InvoiceData } from '../_shared/invoice/types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-guest-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function buildInvoiceNumber(orderId: string, createdAt: string): string {
  const year = new Date(createdAt).getFullYear();
  return `${year}-${orderId.slice(-8).toUpperCase()}`;
}

async function authorize(req: Request, body: { order_id?: string; token?: string }): Promise<string> {
  // 1) Signed token wins (works for guests + email links)
  if (body.token) {
    const tokenOrderId = await verifyToken(body.token);
    if (body.order_id && body.order_id !== tokenOrderId) {
      throw new Error('Token does not match order_id');
    }
    return tokenOrderId;
  }

  if (!body.order_id) throw new Error('Missing order_id');

  // 2) Authenticated user — check ownership or admin
  const authHeader = req.headers.get('Authorization');
  if (authHeader) {
    const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (user) {
      const { data: order } = await admin
        .from('orders')
        .select('user_id, metadata')
        .eq('id', body.order_id)
        .maybeSingle();
      if (order?.user_id === user.id) return body.order_id;

      const { data: isAdmin } = await admin.rpc('is_admin_user', { _user_id: user.id });
      if (isAdmin) return body.order_id;
    }
  }

  // 3) Guest header match
  const guestId = req.headers.get('x-guest-id');
  if (guestId) {
    const { data: order } = await admin
      .from('orders')
      .select('metadata')
      .eq('id', body.order_id)
      .maybeSingle();
    const orderGuestId = (order?.metadata as any)?.guest_id;
    if (orderGuestId && orderGuestId === guestId) return body.order_id;
  }

  throw new Error('Unauthorized');
}

async function buildInvoiceData(orderId: string): Promise<InvoiceData> {
  const { data: order, error: orderErr } = await admin
    .from('orders')
    .select('id, status, order_status, amount, currency, created_at, shipping_address, metadata, payment_method, payment_reference')
    .eq('id', orderId)
    .maybeSingle();

  if (orderErr || !order) throw new InvoiceValidationError('Order not found');

  const { data: items, error: itemsErr } = await admin
    .from('order_items')
    .select('quantity, unit_price, total_price, product_snapshot')
    .eq('order_id', orderId);

  if (itemsErr) throw new InvoiceValidationError('Cannot fetch items');
  if (!items || items.length === 0) throw new InvoiceValidationError('Order has no items');

  const { data: payment } = await admin
    .from('payments')
    .select('payment_method, processed_at, stripe_payment_intent_id, status')
    .eq('order_id', orderId)
    .maybeSingle();

  const subtotal = items.reduce((s, it) => s + Number(it.total_price || 0), 0) / 100;
  const total = Number(order.amount || 0) / 100;
  const shipping = Math.max(0, total - subtotal);
  const discount = Number((order.metadata as any)?.discount_amount || 0) / 100;
  const addr = (order.shipping_address as any) || {};

  const orderStatus = (order.status || order.order_status || '').toLowerCase();
  const isPaid = ['paid', 'completed', 'confirmed', 'processing', 'shipped', 'delivered']
    .includes(orderStatus) || payment?.status === 'succeeded';

  const data: InvoiceData = {
    invoice_number: buildInvoiceNumber(order.id, order.created_at),
    order_id: order.id,
    order_short: order.id.slice(-8).toUpperCase(),
    issue_date: order.created_at,
    currency: order.currency || 'EUR',
    client: {
      name: `${addr.first_name || ''} ${addr.last_name || ''}`.trim() || 'Client',
      email: (order.metadata as any)?.customer_email || addr.email || '',
      address_line1: addr.address_line1 || '',
      address_line2: addr.address_line2 || undefined,
      postal_code: addr.postal_code || '',
      city: addr.city || '',
      country: addr.country || '',
    },
    items: items.map((it) => ({
      name: (it.product_snapshot as any)?.name || 'Produit',
      quantity: it.quantity,
      unit_price: Number(it.unit_price) / 100,
      total: Number(it.total_price) / 100,
    })),
    totals: { subtotal, shipping, discount, total },
    payment: {
      method: payment?.payment_method || order.payment_method || 'Carte bancaire (Stripe)',
      status: isPaid ? 'paid' : 'pending',
      transaction_id: payment?.stripe_payment_intent_id || order.payment_reference || null,
      paid_at: payment?.processed_at || (isPaid ? order.created_at : null),
    },
  };

  validateInvoice(data);
  return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const orderId = await authorize(req, body);

    // Idempotency — return existing snapshot if present
    const { data: existing } = await admin
      .from('invoices')
      .select('invoice_number, html, json_snapshot')
      .eq('order_id', orderId)
      .maybeSingle();

    if (existing) {
      return jsonResponse({
        invoice_number: existing.invoice_number,
        html: existing.html,
        cached: true,
      });
    }

    const data = await buildInvoiceData(orderId);
    const html = renderInvoiceHTML(data);

    const { error: insertErr } = await admin.from('invoices').insert({
      order_id: orderId,
      invoice_number: data.invoice_number,
      json_snapshot: data,
      html,
      total_amount: data.totals.total,
      currency: data.currency,
    });

    if (insertErr && !insertErr.message.includes('duplicate')) {
      console.error('[generate-invoice] insert failed', insertErr);
    }

    return jsonResponse({ invoice_number: data.invoice_number, html, cached: false });
  } catch (err) {
    const status = err instanceof InvoiceValidationError ? 400
      : err.message === 'Unauthorized' ? 401
      : 500;
    console.error('[generate-invoice]', err.message);
    return jsonResponse({ error: err.message }, status);
  }
});
