import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import * as React from 'https://esm.sh/react@18.3.1';
import { renderAsync } from 'https://esm.sh/@react-email/components@0.0.22';
import { ShippingNotificationEmail } from './_templates/shipping-notification.tsx';

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

interface ShippingNotificationRequest {
  orderId: string;
  customerEmail: string;
  customerName: string;
  trackingNumber?: string;
  carrier?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
  shippingAddress: {
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
  items: Array<{ name: string; quantity: number; image?: string }>;
  previewOnly?: boolean;
}

const logStep = (step: string, details?: any) => {
  console.log(
    `[send-shipping-notification] ${step}`,
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

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const isInternalCall = token === supabaseServiceKey;

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

    logStep('Starting shipping notification email send');
    const data: ShippingNotificationRequest = await req.json();

    const { data: existingLog } = await serviceClient
      .from('email_logs')
      .select('id')
      .eq('order_id', data.orderId)
      .eq('template_name', 'shipping-notification')
      .eq('status', 'sent')
      .maybeSingle();

    if (existingLog && !data.previewOnly) {
      logStep('Email already sent (Idempotency)');
      return new Response(
        JSON.stringify({ success: true, message: 'Already sent' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    if (!data.orderId || !data.customerEmail || !data.customerName) {
      throw new Error(
        'Missing required fields: orderId, customerEmail, or customerName'
      );
    }

    logStep('Rendering email template');
    const html = await renderAsync(
      React.createElement(ShippingNotificationEmail, {
        customerName: data.customerName,
        orderNumber: data.orderId.slice(-8).toUpperCase(),
        trackingNumber: data.trackingNumber,
        carrier: data.carrier,
        trackingUrl: data.trackingUrl,
        estimatedDelivery: data.estimatedDelivery,
        shippingAddress: data.shippingAddress || {
          address: '',
          city: '',
          postalCode: '',
          country: 'France',
        },
        items: data.items || [],
      })
    );

    if (data.previewOnly) {
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

    const subject = `Votre commande #${data.orderId.slice(-8).toUpperCase()} a été expédiée ! 📦`;
    logStep('Sending email via Brevo', { to: data.customerEmail });
    const emailResult = await sendBrevoEmail(data.customerEmail, subject, html);
    logStep('Email sent successfully', { messageId: emailResult.messageId });

    await logEmailToDatabase(
      serviceClient,
      'shipping-notification',
      data.customerEmail,
      data.customerName,
      data.orderId,
      'sent',
      null,
      {
        messageId: emailResult.messageId,
        trackingNumber: data.trackingNumber,
        carrier: data.carrier,
      }
    );

    return new Response(
      JSON.stringify({
        success: true,
        emailId: emailResult.messageId,
        message: 'Shipping notification email sent successfully',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error: any) {
    logStep('Error sending shipping notification', { error: error.message });
    const body = await req
      .clone()
      .json()
      .catch(() => ({}));
    await logEmailToDatabase(
      serviceClient,
      'shipping-notification',
      body.customerEmail || 'unknown',
      body.customerName || null,
      body.orderId || null,
      'failed',
      error.message,
      {}
    );
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
