import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { buildOrderConfirmationHtml } from './_templates/order-confirmation.ts';
import { signToken } from '../_shared/invoice/token.ts';
import type { Database, Json } from '../_shared/database.types.ts';
import {
  buildEmailPricingFromSnapshot,
  isPricingSnapshotV1,
  shippingAddressFromOrderRow,
  type DbOrderItemRow,
} from './_lib/email-pricing-from-db.ts';

type DbClient = SupabaseClient<Database>;

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
const FROM_NAME = 'Rif Raw Straw';

const parseFromEmail = (raw: string | undefined): string => {
  if (!raw) return 'noreply@rifelegance.com';
  const match = raw.match(/<([^>]+)>/);
  return match ? match[1].trim() : raw.trim();
};
const FROM_EMAIL = parseFromEmail(Deno.env.get('RESEND_FROM_EMAIL'));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  image?: string;
}

interface OrderConfirmationRequest {
  orderId: string;
  customerEmail: string;
  customerName: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  discount?: number;
  total: number;
  currency?: string;
  shippingAddress: {
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
  previewOnly?: boolean;
}

const logStep = (step: string, details?: unknown) => {
  console.log(
    `[send-order-confirmation] ${step}`,
    details !== undefined ? JSON.stringify(details) : ''
  );
};

const sendBrevoEmail = async (
  to: string,
  subject: string,
  htmlContent: string
): Promise<{ messageId?: string }> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  const senderEmail = FROM_EMAIL.replace(/.*<(.+)>/, '$1').trim() || FROM_EMAIL;

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: FROM_NAME, email: senderEmail },
        to: [{ email: to }],
        subject,
        htmlContent,
      }),
      signal: controller.signal,
    });
    const data = await res.json();
    if (!res.ok)
      throw new Error(`Brevo error (${res.status}): ${JSON.stringify(data)}`);
    return { messageId: data.messageId };
  } finally {
    clearTimeout(timeout);
  }
};

const logEmailToDatabase = async (
  supabase: DbClient,
  templateName: string,
  recipientEmail: string,
  recipientName: string | null,
  orderId: string | null,
  status: string,
  errorMessage: string | null,
  metadata: Json | null
) => {
  try {
    await supabase.from('email_logs').insert({
      template_name: templateName,
      recipient_email: recipientEmail,
      recipient_name: recipientName,
      order_id: orderId,
      status,
      error_message: errorMessage,
      metadata,
      sent_at: status === 'sent' ? new Date().toISOString() : null,
    });
  } catch (error) {
    console.error('Failed to log email:', error);
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const serviceClient = createClient<Database>(supabaseUrl, supabaseServiceKey);
  let data: OrderConfirmationRequest | undefined;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const isInternalCall = token === serviceRoleKey;

    if (!isInternalCall) {
      const authClient = createClient(
        supabaseUrl,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: claimsData, error: claimsError } =
        await authClient.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
      const userId = claimsData.claims.sub;
      const { data: isAdmin } = await serviceClient.rpc('is_admin_user', {
        user_uuid: userId,
      });
      if (!isAdmin) {
        return new Response(
          JSON.stringify({ error: 'Forbidden - Admin access required' }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }
    }

    logStep('Starting order confirmation email send');
    data = await req.json();

    if (!data!.orderId || !data!.customerEmail || !data!.customerName) {
      throw new Error(
        'Missing required fields: orderId, customerEmail, or customerName'
      );
    }

    const orderDate = new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 7);
    const estimatedDelivery = deliveryDate.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
    });

    // ================================================================
    // AUTHORITATIVE PRICING: prefer orders.pricing_snapshot (v1) when
    // present. The Stripe webhook writes it from the Checkout Session
    // line items, so the email matches the DB + Stripe + SPA exactly.
    // Body totals are used only as a legacy/preview fallback.
    // ================================================================
    let pricing = {
      items: (data!.items || []) as Array<{
        name: string;
        quantity: number;
        price: number;
        image?: string;
        productId?: number;
      }>,
      subtotal: data!.subtotal || 0,
      shipping: data!.shipping || 0,
      discount: data!.discount || 0,
      total: data!.total || 0,
      currency: (data!.currency || 'EUR').toUpperCase(),
      shippingAddress: data!.shippingAddress || {
        address: '',
        city: '',
        postalCode: '',
        country: 'France',
      },
      source: 'body' as 'body' | 'snapshot_v1',
    };

    if (!data!.previewOnly) {
      try {
        const { data: orderRow } = await serviceClient
          .from('orders')
          .select(
            'pricing_snapshot, currency, shipping_address, order_items(product_id, quantity, product_snapshot)'
          )
          .eq('id', data!.orderId)
          .maybeSingle();

        if (orderRow && isPricingSnapshotV1(orderRow.pricing_snapshot)) {
          const orderItems = (orderRow.order_items || []) as DbOrderItemRow[];
          const fromSnap = buildEmailPricingFromSnapshot(
            orderRow.pricing_snapshot,
            orderItems
          );
          const shippingFromDb = shippingAddressFromOrderRow(
            orderRow.shipping_address
          );
          pricing = {
            items: fromSnap.items,
            subtotal: fromSnap.subtotal,
            shipping: fromSnap.shipping,
            discount: fromSnap.discount,
            total: fromSnap.total,
            currency: fromSnap.currency,
            shippingAddress: shippingFromDb || pricing.shippingAddress,
            source: 'snapshot_v1',
          };
          logStep('Using authoritative pricing_snapshot from DB', {
            orderId: data!.orderId,
            total: fromSnap.total,
            currency: fromSnap.currency,
          });
        } else {
          logStep(
            'No v1 pricing_snapshot on order; falling back to request body',
            { orderId: data!.orderId }
          );
        }
      } catch (snapErr) {
        logStep('pricing_snapshot lookup failed (non-fatal)', {
          error: (snapErr as Error).message,
        });
      }
    }

    logStep('Building email HTML', { pricing_source: pricing.source });
    let invoiceToken: string | undefined;
    try {
      invoiceToken = await signToken(data!.orderId);
    } catch (tokErr) {
      logStep('Token signing failed (link will require auth)', {
        error: (tokErr as Error).message,
      });
    }
    const html = buildOrderConfirmationHtml({
      customerName: data!.customerName,
      orderNumber: data!.orderId.slice(-8).toUpperCase(),
      orderDate,
      items: pricing.items,
      subtotal: pricing.subtotal,
      shipping: pricing.shipping,
      discount: pricing.discount,
      total: pricing.total,
      currency: pricing.currency,
      shippingAddress: pricing.shippingAddress,
      estimatedDelivery,
      orderId: data!.orderId,
      invoiceToken,
    });

    if (data!.previewOnly) {
      return new Response(
        JSON.stringify({
          success: true,
          previewHtml: html,
          message: 'Email preview generated',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // ================================================================
    // ATOMIC SEND — single-writer guarantee.
    //
    // Race shape prior to this block:
    //   stripe-webhook ─┐
    //                   ├─► both see no 'sent' row ─► both send Brevo email
    //   verify-payment ─┘
    //
    // Fix: claim the dedup slot in email_logs BEFORE calling Brevo. The
    // partial unique index on (order_id, template_name) WHERE status='sent'
    // (migration 20260325090000_email_logs_order_template_unique.sql) turns
    // the second concurrent insert into a unique_violation; that caller
    // treats the violation as "already delivered" and skips the Brevo call.
    //
    // If Brevo fails for the winning caller we DELETE the reserved row so
    // a subsequent retry can claim the slot again.
    // ================================================================
    const claimPayload = {
      template_name: 'order-confirmation',
      recipient_email: data!.customerEmail,
      recipient_name: data!.customerName,
      order_id: data!.orderId,
      status: 'sent',
      error_message: null,
      metadata: { claim: true, pricing_source: pricing.source },
      sent_at: new Date().toISOString(),
    };
    const { data: claimed, error: claimError } = await serviceClient
      .from('email_logs')
      .insert(claimPayload)
      .select('id')
      .maybeSingle();

    const isUniqueViolation =
      claimError &&
      // Supabase/Postgres exposes code on PostgrestError; 23505 = unique_violation
      ((claimError as { code?: string }).code === '23505' ||
        /duplicate key|unique/i.test(claimError.message || ''));

    if (isUniqueViolation) {
      logStep('Email already claimed by a concurrent caller, skipping Brevo', {
        orderId: data!.orderId,
      });
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          reason: 'already_sent',
          message: 'Order confirmation email already sent',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    if (claimError || !claimed) {
      throw new Error(
        `Unable to reserve email_logs slot: ${claimError?.message || 'unknown error'}`
      );
    }

    const subject = `Confirmation de commande #${data!.orderId.slice(-8).toUpperCase()} - Rif Raw Straw`;
    logStep('Sending email via Brevo', { to: data!.customerEmail });
    let emailResult: { messageId?: string };
    try {
      emailResult = await sendBrevoEmail(data!.customerEmail, subject, html);
    } catch (sendErr) {
      // Release the claim so a retry can re-send; otherwise the failed
      // attempt would permanently lock the slot.
      await serviceClient.from('email_logs').delete().eq('id', claimed.id);
      throw sendErr;
    }
    logStep('Email sent successfully', { messageId: emailResult.messageId });

    await serviceClient
      .from('email_logs')
      .update({
        metadata: {
          messageId: emailResult.messageId,
          itemCount: pricing.items.length,
          total: pricing.total,
          currency: pricing.currency,
          pricing_source: pricing.source,
        },
        sent_at: new Date().toISOString(),
      })
      .eq('id', claimed.id);

    return new Response(
      JSON.stringify({
        success: true,
        emailId: emailResult.messageId,
        message: 'Order confirmation email sent successfully',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep('Error sending order confirmation', { error: msg });
    try {
      await logEmailToDatabase(
        serviceClient,
        'order-confirmation',
        data?.customerEmail || 'unknown',
        data?.customerName || null,
        data?.orderId || null,
        'failed',
        msg,
        {}
      );
    } catch (logErr) {
      console.error('Failed to log email failure:', logErr);
    }
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

serve(handler);
