import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import * as React from 'npm:react@18.3.1';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { DeliveryConfirmationEmail } from './_templates/delivery-confirmation.tsx';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize Supabase client for logging
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface DeliveryConfirmationRequest {
  orderId: string;
  customerEmail: string;
  customerName: string;
  deliveryDate?: string;
  items: Array<{
    name: string;
    quantity: number;
  }>;
  reviewUrl?: string;
  previewOnly?: boolean;
}

const logStep = (step: string, details?: any) => {
  console.log(`[send-delivery-confirmation] ${step}`, details ? JSON.stringify(details) : '');
};

const logEmailToDatabase = async (
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
      status: status,
      error_message: errorMessage,
      metadata: metadata,
      sent_at: status === 'sent' ? new Date().toISOString() : null
    });
  } catch (error) {
    console.error('Failed to log email:', error);
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Starting delivery confirmation email send');
    
    const data: DeliveryConfirmationRequest = await req.json();
    
    logStep('Received delivery data', {
      orderId: data.orderId,
      customerEmail: data.customerEmail,
      itemCount: data.items?.length || 0,
      previewOnly: data.previewOnly
    });

    if (!data.orderId || !data.customerEmail || !data.customerName) {
      throw new Error('Missing required fields: orderId, customerEmail, or customerName');
    }

    const deliveryDate = data.deliveryDate || new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    logStep('Rendering email template');
    
    const html = await renderAsync(
      React.createElement(DeliveryConfirmationEmail, {
        customerName: data.customerName,
        orderNumber: data.orderId.slice(-8).toUpperCase(),
        deliveryDate: deliveryDate,
        items: data.items || [],
        reviewUrl: data.reviewUrl
      })
    );

    logStep('Email template rendered successfully');

    // If preview only, return the HTML without sending
    if (data.previewOnly) {
      return new Response(
        JSON.stringify({
          success: true,
          previewHtml: html,
          message: 'Email preview generated'
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Rif Raw Straw <onboarding@resend.dev>";
    
    logStep('Sending email', { to: data.customerEmail, from: fromEmail });
    
    const emailResponse = await resend.emails.send({
      from: fromEmail,
      to: [data.customerEmail],
      subject: `Votre commande #${data.orderId.slice(-8).toUpperCase()} a été livrée ! ✅`,
      html: html,
    });

    logStep('Email sent successfully', { emailId: emailResponse.data?.id });

    // Log successful email
    await logEmailToDatabase(
      'delivery-confirmation',
      data.customerEmail,
      data.customerName,
      data.orderId,
      'sent',
      null,
      { emailId: emailResponse.data?.id, itemCount: data.items?.length || 0 }
    );

    return new Response(
      JSON.stringify({
        success: true,
        emailId: emailResponse.data?.id,
        message: 'Delivery confirmation email sent successfully'
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    logStep('Error sending delivery confirmation', { error: error.message });

    // Log failed email
    const body = await req.clone().json().catch(() => ({}));
    await logEmailToDatabase(
      'delivery-confirmation',
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
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
