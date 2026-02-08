import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import * as React from 'npm:react@18.3.1';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { DeliveryConfirmationEmail } from './_templates/delivery-confirmation.tsx';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface DeliveryConfirmationRequest {
  orderId: string;
  customerEmail: string;
  customerName: string;
  deliveryDate?: string;
  items: Array<{ name: string; quantity: number; }>;
  reviewUrl?: string;
  previewOnly?: boolean;
}

const logStep = (step: string, details?: any) => {
  console.log(`[send-delivery-confirmation] ${step}`, details ? JSON.stringify(details) : '');
};

const logEmailToDatabase = async (
  supabase: any, templateName: string, recipientEmail: string, recipientName: string | null,
  orderId: string | null, status: string, errorMessage: string | null, metadata: any
) => {
  try {
    await supabase.from('email_logs').insert({
      template_name: templateName, recipient_email: recipientEmail, recipient_name: recipientName,
      order_id: orderId, status, error_message: errorMessage, metadata,
      sent_at: status === 'sent' ? new Date().toISOString() : null
    });
  } catch (error) { console.error('Failed to log email:', error); }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Validate caller is an authenticated admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    const userId = claimsData.claims.sub;
    const { data: isAdmin } = await serviceClient.rpc("is_admin_user", { user_uuid: userId });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden - Admin access required" }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    logStep('Starting delivery confirmation email send');
    const data: DeliveryConfirmationRequest = await req.json();
    
    logStep('Received delivery data', {
      orderId: data.orderId, customerEmail: data.customerEmail,
      itemCount: data.items?.length || 0, previewOnly: data.previewOnly
    });

    if (!data.orderId || !data.customerEmail || !data.customerName) {
      throw new Error('Missing required fields: orderId, customerEmail, or customerName');
    }

    const deliveryDate = data.deliveryDate || new Date().toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric'
    });

    logStep('Rendering email template');
    const html = await renderAsync(
      React.createElement(DeliveryConfirmationEmail, {
        customerName: data.customerName,
        orderNumber: data.orderId.slice(-8).toUpperCase(),
        deliveryDate, items: data.items || [], reviewUrl: data.reviewUrl
      })
    );
    logStep('Email template rendered successfully');

    if (data.previewOnly) {
      return new Response(
        JSON.stringify({ success: true, previewHtml: html, message: 'Email preview generated' }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Rif Raw Straw <onboarding@resend.dev>";
    logStep('Sending email', { to: data.customerEmail, from: fromEmail });
    
    const emailResponse = await resend.emails.send({
      from: fromEmail, to: [data.customerEmail],
      subject: `Votre commande #${data.orderId.slice(-8).toUpperCase()} a été livrée ! ✅`,
      html: html,
    });

    logStep('Email sent successfully', { emailId: emailResponse.data?.id });
    await logEmailToDatabase(serviceClient, 'delivery-confirmation', data.customerEmail, data.customerName,
      data.orderId, 'sent', null, { emailId: emailResponse.data?.id, itemCount: data.items?.length || 0 });

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.data?.id, message: 'Delivery confirmation email sent successfully' }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    logStep('Error sending delivery confirmation', { error: error.message });
    const body = await req.clone().json().catch(() => ({}));
    await logEmailToDatabase(serviceClient, 'delivery-confirmation', body.customerEmail || 'unknown',
      body.customerName || null, body.orderId || null, 'failed', error.message, {});
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
