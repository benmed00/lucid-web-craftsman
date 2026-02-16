import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import * as React from 'npm:react@18.3.1';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { CancellationEmail } from './_templates/cancellation-email.tsx';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface CancellationRequest {
  orderId: string;
  customerEmail: string;
  customerName: string;
  isRefund?: boolean;
  reason?: string;
  refundAmount?: number;
  orderAmount?: number;
  currency?: string;
  items: Array<{ name: string; quantity: number; price?: number; }>;
  refundMethod?: string;
  refundDelay?: string;
  previewOnly?: boolean;
}

const logStep = (step: string, details?: any) => {
  console.log(`[send-cancellation-email] ${step}`, details ? JSON.stringify(details) : '');
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
    // Validate caller: either service role key (internal) or authenticated admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const token = authHeader.replace("Bearer ", "");
    const isInternalCall = token === supabaseServiceKey;

    if (!isInternalCall) {
      const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } }
      });
      const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
      const userId = claimsData.claims.sub;
      const { data: isAdmin } = await serviceClient.rpc("is_admin_user", { user_uuid: userId });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden - Admin access required" }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
    }

    logStep('Starting cancellation/refund email send');
    const data: CancellationRequest = await req.json();
    const isRefund = data.isRefund ?? (data.refundAmount !== undefined && data.refundAmount > 0);
    
    logStep('Received cancellation data', {
      orderId: data.orderId, customerEmail: data.customerEmail,
      isRefund, refundAmount: data.refundAmount, previewOnly: data.previewOnly
    });

    if (!data.orderId || !data.customerEmail || !data.customerName) {
      throw new Error('Missing required fields: orderId, customerEmail, or customerName');
    }

    const cancellationDate = new Date().toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric'
    });

    logStep('Rendering email template');
    const html = await renderAsync(
      React.createElement(CancellationEmail, {
        customerName: data.customerName,
        orderNumber: data.orderId.slice(-8).toUpperCase(),
        cancellationDate, reason: data.reason, isRefund,
        refundAmount: data.refundAmount, currency: data.currency || 'EUR',
        items: data.items || [], refundMethod: data.refundMethod, refundDelay: data.refundDelay
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
    const subject = isRefund 
      ? `Remboursement de votre commande #${data.orderId.slice(-8).toUpperCase()} 💰`
      : `Annulation de votre commande #${data.orderId.slice(-8).toUpperCase()}`;
    
    logStep('Sending email', { to: data.customerEmail, from: fromEmail, subject });
    const emailResponse = await resend.emails.send({
      from: fromEmail, to: [data.customerEmail], subject, html,
    });

    logStep('Email sent successfully', { emailId: emailResponse.data?.id });
    await logEmailToDatabase(serviceClient, isRefund ? 'refund-notification' : 'cancellation-notification',
      data.customerEmail, data.customerName, data.orderId, 'sent', null,
      { emailId: emailResponse.data?.id, isRefund, refundAmount: data.refundAmount });

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.data?.id, message: 'Cancellation/refund email sent successfully' }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    logStep('Error sending cancellation email', { error: error.message });
    const body = await req.clone().json().catch(() => ({}));
    await logEmailToDatabase(serviceClient, 'cancellation-notification', body.customerEmail || 'unknown',
      body.customerName || null, body.orderId || null, 'failed', error.message, {});
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
