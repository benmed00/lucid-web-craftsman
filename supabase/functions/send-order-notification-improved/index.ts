import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
const FROM_NAME = 'Rif Raw Straw';
const parseFromEmail = (raw: string | undefined): string => {
  if (!raw) return 'noreply@rifelegance.com';
  const match = raw.match(/<([^>]+)>/);
  return match ? match[1].trim() : raw.trim();
};
const FROM_EMAIL = parseFromEmail(Deno.env.get('RESEND_FROM_EMAIL'));
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface OrderNotificationPayload {
  order_id: string;
  old_status?: string;
  new_status: string;
}

const getStatusText = (status: string): string => {
  const statusMap: { [key: string]: string } = {
    pending: 'En attente de paiement',
    paid: 'Payée',
    processing: 'En préparation',
    shipped: 'Expédiée',
    delivered: 'Livrée',
    cancelled: 'Annulée',
  };
  return statusMap[status] || status;
};

const checkIdempotency = async (
  supabase: any,
  orderId: string,
  status: string
): Promise<boolean> => {
  const { data } = await supabase
    .from('email_logs')
    .select('id')
    .eq('order_id', orderId)
    .eq('metadata->>status', status)
    .eq('status', 'sent')
    .maybeSingle();
  return !!data;
};

const sendBrevoEmail = async (
  to: string,
  subject: string,
  htmlContent: string
): Promise<{ messageId?: string }> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: FROM_NAME,
          email: FROM_EMAIL.replace(/.*<(.+)>/, '$1').trim() || FROM_EMAIL,
        },
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

const getEmailContent = (
  status: string,
  orderData: any
): { subject: string; html: string; templateName: string } => {
  const statusText = getStatusText(status);
  const formattedTotal = `${(orderData.amount / 100).toFixed(2)} ${orderData.currency?.toUpperCase() || 'EUR'}`;
  const orderNumber = orderData.id.slice(-8).toUpperCase();

  switch (status) {
    case 'paid':
      return {
        templateName: 'order-confirmation',
        subject: `Confirmation de commande #${orderNumber}`,
        html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;"><h1 style="color: #2c5530;">Merci pour votre commande !</h1></div>
          <p>Bonjour ${orderData.customer_name},</p>
          <p>Nous avons bien reçu votre paiement et votre commande #${orderNumber} est confirmée.</p>
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2c5530;">
            <h3 style="margin-top: 0; color: #2c5530;">Détails de la commande</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 5px 0;"><strong>Numéro:</strong></td><td>#${orderNumber}</td></tr>
              <tr><td style="padding: 5px 0;"><strong>Montant:</strong></td><td>${formattedTotal}</td></tr>
              <tr><td style="padding: 5px 0;"><strong>Date:</strong></td><td>${new Date(orderData.created_at).toLocaleDateString('fr-FR')}</td></tr>
            </table>
          </div>
          <p>Nous préparons votre commande avec le plus grand soin.</p>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5; text-align: center; color: #666;">
            <p>Cordialement,<br><strong style="color: #2c5530;">L'équipe Rif Raw Straw</strong></p>
          </div></div>`,
      };
    case 'shipped':
      return {
        templateName: 'shipping-notification',
        subject: `📦 Votre commande #${orderNumber} a été expédiée`,
        html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2c5530; text-align: center;">Votre commande est en route !</h1>
          <p>Bonjour ${orderData.customer_name},</p>
          <p>Votre commande #${orderNumber} vient d'être expédiée.</p>
          ${orderData.tracking_number ? `<p>N° de suivi: <strong>${orderData.tracking_number}</strong> (${orderData.carrier || ''})</p>` : ''}
          <p>Vous devriez la recevoir dans les prochains jours.</p>
          <div style="margin-top: 30px; text-align: center; color: #666;"><p>Cordialement,<br><strong style="color: #2c5530;">L'équipe Rif Raw Straw</strong></p></div></div>`,
      };
    case 'delivered':
      return {
        templateName: 'delivery-confirmation',
        subject: `✅ Votre commande #${orderNumber} a été livrée`,
        html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2c5530; text-align: center;">Commande livrée !</h1>
          <p>Bonjour ${orderData.customer_name},</p>
          <p>Votre commande #${orderNumber} a été livrée.</p>
          <p>Nous espérons que vos articles vous plaisent !</p>
          <div style="margin-top: 30px; text-align: center; color: #666;"><p>Cordialement,<br><strong style="color: #2c5530;">L'équipe Rif Raw Straw</strong></p></div></div>`,
      };
    case 'cancelled':
      return {
        templateName: 'cancellation-notification',
        subject: `Annulation de votre commande #${orderNumber}`,
        html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #dc2626; text-align: center;">Commande annulée</h1>
          <p>Bonjour ${orderData.customer_name},</p>
          <p>Le statut de votre commande #${orderNumber} est passé à: <strong>Annulée</strong></p>
          <p>Si vous avez déjà été débité, un remboursement sera effectué sous peu.</p>
          <div style="margin-top: 30px; text-align: center; color: #666;"><p>Cordialement,<br><strong style="color: #2c5530;">L'équipe Rif Raw Straw</strong></p></div></div>`,
      };
    default:
      return {
        templateName: 'order-status-update',
        subject: `Mise à jour de votre commande #${orderNumber}`,
        html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2c5530;">Mise à jour de commande</h2>
          <p>Bonjour ${orderData.customer_name},</p>
          <p>Le statut de votre commande #${orderNumber} a été mis à jour: <strong>${statusText}</strong></p>
          <div style="margin-top: 30px; text-align: center; color: #666;"><p>Cordialement,<br><strong style="color: #2c5530;">L'équipe Rif Raw Straw</strong></p></div></div>`,
      };
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const internalSecret = req.headers.get('X-Internal-Secret');
    const configuredSecret = Deno.env.get('INTERNAL_NOTIFY_SECRET');
    const isInternalCall =
      token === supabaseServiceKey ||
      (configuredSecret && internalSecret === configuredSecret);

    if (!isInternalCall) {
      const authClient = createClient(
        supabaseUrl,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        {
          global: { headers: { Authorization: authHeader } },
        }
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
      const { data: isAdmin } = await supabase.rpc('is_admin_user', {
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

    const payload: OrderNotificationPayload = await req.json();
    console.log('Processing order notification:', payload);

    const alreadySent = await checkIdempotency(
      supabase,
      payload.order_id,
      payload.new_status
    );
    if (alreadySent) {
      console.log(
        `Email already sent for order ${payload.order_id} and status ${payload.new_status}`
      );
      return new Response(
        JSON.stringify({ success: true, message: 'Already sent' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select(`*`)
      .eq('id', payload.order_id)
      .single();

    if (orderError || !orderData) {
      throw new Error(
        `Order not found: ${orderError?.message || 'Unknown error'}`
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.admin.getUserById(orderData.user_id);
    if (userError || !user) {
      throw new Error(
        `User not found: ${userError?.message || 'Unknown error'}`
      );
    }

    const customerName = user.user_metadata?.full_name || 'Client';
    const customerEmail = user.email;
    if (!customerEmail) throw new Error('Customer email not found');

    const emailOrderData = {
      ...orderData,
      customer_name: customerName,
      customer_email: customerEmail,
    };
    const { subject, html, templateName } = getEmailContent(
      payload.new_status,
      emailOrderData
    );

    console.log(
      `Sending email via Brevo to ${customerEmail} for order ${payload.order_id} status: ${payload.new_status}`
    );

    const emailResult = await sendBrevoEmail(customerEmail, subject, html);
    console.log('Email sent successfully:', emailResult);

    await supabase.from('email_logs').insert({
      template_name: templateName,
      recipient_email: customerEmail,
      recipient_name: customerName,
      order_id: payload.order_id,
      status: 'sent',
      metadata: {
        status: payload.new_status,
        messageId: emailResult.messageId,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        emailId: emailResult.messageId,
        order_id: payload.order_id,
        status: payload.new_status,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error('Error in send-order-notification-improved:', error);
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
