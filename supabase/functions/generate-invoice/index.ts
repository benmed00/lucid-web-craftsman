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

/** Statuses that imply the order has been paid (besides explicit payment row). */
const PAID_ORDER_STATUSES = ['paid', 'completed', 'confirmed', 'processing', 'shipped', 'delivered'];
const PAID_PAYMENT_STATUSES = ['succeeded', 'completed', 'paid'];

async function buildInvoiceData(orderId: string): Promise<InvoiceData> {
  console.log('[generate-invoice] [step1] fetching order', { orderId });
  // 1) ORDER
  const { data: order, error: orderErr } = await admin
    .from('orders')
    .select('id, status, order_status, amount, currency, created_at, shipping_address, metadata, payment_method, payment_reference')
    .eq('id', orderId)
    .maybeSingle();

  if (orderErr) throw new InvoiceValidationError(`Order fetch failed: ${orderErr.message}`);
  if (!order) throw new InvoiceValidationError('Order not found');
  console.log('[generate-invoice] [step1] order ok', { id: order.id, amount: order.amount, status: order.status });

  // 2) ITEMS — strict
  console.log('[generate-invoice] [step2] fetching items', { orderId });
  const { data: items, error: itemsErr } = await admin
    .from('order_items')
    .select('quantity, unit_price, total_price, product_snapshot')
    .eq('order_id', orderId);

  if (itemsErr) throw new InvoiceValidationError(`Items fetch failed: ${itemsErr.message}`);
  if (!items || items.length === 0) throw new InvoiceValidationError('Order has no items');
  console.log('[generate-invoice] [step2] items ok', { count: items.length });

  // 3) PAYMENT (latest)
  console.log('[generate-invoice] [step3] fetching payments', { orderId });
  const { data: payments, error: payErr } = await admin
    .from('payments')
    .select('payment_method, processed_at, stripe_payment_intent_id, status, amount, created_at')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (payErr) throw new InvoiceValidationError(`Payments fetch failed: ${payErr.message}`);
  const payment = payments?.[0];
  console.log('[generate-invoice] [step3] payment', { found: !!payment, status: payment?.status });

  // 4) AMOUNTS — values are stored in EUROS (not cents). Compute strictly from items.
  const subtotal = items.reduce((s, it) => s + Number(it.total_price || 0), 0);
  const orderTotal = Number(order.amount || 0);
  const discount = Number((order.metadata as any)?.discount_amount || 0);
  // Shipping = order total - subtotal + discount (clamped). If order.amount missing, fall back to subtotal.
  const total = orderTotal > 0 ? orderTotal : subtotal;
  const shipping = Math.max(0, total - subtotal + discount);

  // 5) PAID STATUS — order status OR payment row in a paid state
  const orderStatus = (order.status || order.order_status || '').toLowerCase();
  const paymentStatus = (payment?.status || '').toLowerCase();
  const isPaid = PAID_ORDER_STATUSES.includes(orderStatus) || PAID_PAYMENT_STATUSES.includes(paymentStatus);

  // 6) STRICT: paid orders MUST have a transaction reference
  const transactionId = payment?.stripe_payment_intent_id || order.payment_reference || null;
  if (isPaid && !transactionId) {
    throw new InvoiceValidationError('Paid order has no payment reference');
  }
  // 6b) STRICT: total must be > 0
  if (total <= 0) {
    throw new InvoiceValidationError(`Invalid invoice total: ${total}`);
  }

  const addr = (order.shipping_address as any) || {};
  const fullName = `${addr.first_name || ''} ${addr.last_name || ''}`.trim();
  const email = (order.metadata as any)?.customer_email || addr.email || '';
  if (!email) throw new InvoiceValidationError('Order has no customer email');

  const data: InvoiceData = {
    invoice_number: buildInvoiceNumber(order.id, order.created_at),
    order_id: order.id,
    order_short: order.id.slice(-8).toUpperCase(),
    issue_date: order.created_at,
    currency: (order.currency || 'EUR').toUpperCase(),
    client: {
      name: fullName || email.split('@')[0],
      email,
      address_line1: addr.address_line1 || addr.address || '',
      address_line2: addr.address_line2 || undefined,
      postal_code: addr.postal_code || addr.zip || '',
      city: addr.city || '',
      country: addr.country || '',
    },
    items: items.map((it) => ({
      name: (it.product_snapshot as any)?.name || (it.product_snapshot as any)?.title || 'Produit',
      quantity: Number(it.quantity) || 1,
      unit_price: Number(it.unit_price) || 0,
      total: Number(it.total_price) || 0,
    })),
    totals: { subtotal, shipping, discount, total },
    payment: {
      method: payment?.payment_method || order.payment_method || 'Carte bancaire (Stripe)',
      status: isPaid ? 'paid' : 'pending',
      transaction_id: transactionId,
      paid_at: payment?.processed_at || (isPaid ? order.created_at : null),
    },
  };

  validateInvoice(data);
  console.log('[generate-invoice] [step4] validated', { invoice_number: data.invoice_number, total, items: items.length, paid: isPaid });
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
      console.error('[generate-invoice] [step5] insert failed', insertErr);
    } else {
      console.log('[generate-invoice] [step5] snapshot saved', { invoice_number: data.invoice_number });
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
