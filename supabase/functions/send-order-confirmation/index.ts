import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { buildOrderConfirmationHtml } from './_templates/order-confirmation.ts';
import {
  buildEmailPricingFromSnapshot,
  isPricingSnapshotV1,
  shippingAddressFromOrderRow,
  type DbOrderItemRow,
} from './_lib/email-pricing-from-db.ts';

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
const SITE_URL = (
  Deno.env.get('SITE_URL') || 'https://www.rifelegance.com'
).replace(/\/+$/, '');
const ORDER_CONFIRMATION_TOKEN_SECRET =
  Deno.env.get('ORDER_CONFIRMATION_TOKEN_SECRET') || supabaseServiceKey;

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  image?: string;
  productId?: number;
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

const buildOrderReference = (orderId: string): string =>
  `CMD-${orderId.replace(/-/g, '').toUpperCase()}`;

const bytesToBase64Url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const toBase64Url = (value: string): string =>
  bytesToBase64Url(new TextEncoder().encode(value));

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

const buildOrderConfirmationToken = async (
  orderId: string,
  customerEmail: string,
  orderReference: string
): Promise<string> => {
  const payload = toBase64Url(
    JSON.stringify({
      oid: orderId,
      ref: orderReference,
      em: customerEmail.toLowerCase().trim(),
      exp: Date.now() + 1000 * 60 * 60 * 24 * 30, // 30 days
    })
  );
  const signature = await hmacSha256Base64Url(
    payload,
    ORDER_CONFIRMATION_TOKEN_SECRET
  );
  return `${payload}.${signature}`;
};

const logStep = (step: string, details?: any) => {
  console.log(
    `[send-order-confirmation] ${step}`,
    details ? JSON.stringify(details) : ''
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
  supabase: any,
  templateName: string,
  recipientEmail: string,
  recipientName: string | null,
  orderId: string | null,
  status: string,
  errorMessage: string | null,
  metadata: any
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

  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
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

    let emailItems: OrderItem[] = data!.items || [];
    let emailSubtotal = data!.subtotal || 0;
    let emailShipping = data!.shipping || 0;
    let emailDiscount = data!.discount || 0;
    let emailTotal = data!.total || 0;
    let emailCurrency = (data!.currency || 'EUR').toUpperCase();
    let emailShippingAddress = data!.shippingAddress || {
      address: '',
      city: '',
      postalCode: '',
      country: 'France',
    };

    if (isInternalCall) {
      const { data: dbOrder, error: dbOrderError } = await serviceClient
        .from('orders')
        .select(
          'pricing_snapshot, currency, shipping_address, order_items (product_id, quantity, product_snapshot)'
        )
        .eq('id', data!.orderId)
        .maybeSingle();

      if (dbOrderError) {
        logStep('Could not load order for DB-backed email pricing', {
          message: dbOrderError.message,
        });
      } else if (dbOrder && isPricingSnapshotV1(dbOrder.pricing_snapshot)) {
        const built = buildEmailPricingFromSnapshot(
          dbOrder.pricing_snapshot,
          (dbOrder.order_items as DbOrderItemRow[]) || []
        );
        emailItems = built.items;
        emailSubtotal = built.subtotal;
        emailShipping = built.shipping;
        emailDiscount = built.discount;
        emailTotal = built.total;
        emailCurrency = built.currency;
        logStep('Email totals from orders.pricing_snapshot', {
          orderId: data!.orderId,
          lines: emailItems.length,
        });
      }

      if (dbOrder && !dbOrderError) {
        const fromDb = shippingAddressFromOrderRow(dbOrder.shipping_address);
        if (fromDb?.address) {
          emailShippingAddress = {
            address: emailShippingAddress.address || fromDb.address,
            city: emailShippingAddress.city || fromDb.city,
            postalCode: emailShippingAddress.postalCode || fromDb.postalCode,
            country: emailShippingAddress.country || fromDb.country,
          };
        }
        if (
          dbOrder.currency &&
          !isPricingSnapshotV1(dbOrder.pricing_snapshot)
        ) {
          emailCurrency = String(dbOrder.currency).toUpperCase();
        }
      }
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

    logStep('Building email HTML');
    const orderReference = buildOrderReference(data!.orderId);
    const confirmationToken = await buildOrderConfirmationToken(
      data!.orderId,
      data!.customerEmail,
      orderReference
    );
    const confirmationUrl = `${SITE_URL}/order-confirmation/${encodeURIComponent(orderReference)}?token=${encodeURIComponent(confirmationToken)}`;
    const orderRecoveryUrl = `${SITE_URL}/order-confirmation?order_id=${encodeURIComponent(data!.orderId)}&payment_complete=1`;

    const html = buildOrderConfirmationHtml({
      customerName: data!.customerName,
      orderNumber: orderReference,
      orderDate,
      items: emailItems,
      subtotal: emailSubtotal,
      shipping: emailShipping,
      discount: emailDiscount,
      total: emailTotal,
      currency: emailCurrency,
      shippingAddress: emailShippingAddress,
      estimatedDelivery,
      orderId: data!.orderId,
      confirmationUrl,
      orderRecoveryUrl,
      siteUrl: SITE_URL,
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

    const subject = `Confirmation de commande #${orderReference} - Rif Raw Straw`;
    logStep('Sending email via Brevo', { to: data!.customerEmail });
    const emailResult = await sendBrevoEmail(
      data!.customerEmail,
      subject,
      html
    );
    logStep('Email sent successfully', { messageId: emailResult.messageId });

    await logEmailToDatabase(
      serviceClient,
      'order-confirmation',
      data!.customerEmail,
      data!.customerName,
      data!.orderId,
      'sent',
      null,
      {
        messageId: emailResult.messageId,
        itemCount: emailItems.length,
        total: emailTotal,
      }
    );

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
  } catch (error: any) {
    logStep('Error sending order confirmation', { error: error.message });
    try {
      await logEmailToDatabase(
        serviceClient,
        'order-confirmation',
        data?.customerEmail || 'unknown',
        data?.customerName || null,
        data?.orderId || null,
        'failed',
        error.message,
        {}
      );
    } catch (logErr) {
      console.error('Failed to log email failure:', logErr);
    }
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
