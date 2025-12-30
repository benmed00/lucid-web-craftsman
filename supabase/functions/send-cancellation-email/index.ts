import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";
import * as React from 'npm:react@18.3.1';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { CancellationEmail } from './_templates/cancellation-email.tsx';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CancellationRequest {
  orderId: string;
  customerEmail: string;
  customerName: string;
  isRefund: boolean;
  reason?: string;
  refundAmount?: number;
  currency?: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  refundMethod?: string;
  refundDelay?: string;
}

const logStep = (step: string, details?: any) => {
  console.log(`[send-cancellation-email] ${step}`, details ? JSON.stringify(details) : '');
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Starting cancellation/refund email send');
    
    const data: CancellationRequest = await req.json();
    
    logStep('Received cancellation data', {
      orderId: data.orderId,
      customerEmail: data.customerEmail,
      isRefund: data.isRefund,
      refundAmount: data.refundAmount
    });

    if (!data.orderId || !data.customerEmail || !data.customerName) {
      throw new Error('Missing required fields: orderId, customerEmail, or customerName');
    }

    const cancellationDate = new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    logStep('Rendering email template');
    
    const html = await renderAsync(
      React.createElement(CancellationEmail, {
        customerName: data.customerName,
        orderNumber: data.orderId.slice(-8).toUpperCase(),
        cancellationDate: cancellationDate,
        reason: data.reason,
        isRefund: data.isRefund,
        refundAmount: data.refundAmount,
        currency: data.currency || 'EUR',
        items: data.items || [],
        refundMethod: data.refundMethod,
        refundDelay: data.refundDelay
      })
    );

    logStep('Email template rendered successfully');

    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Rif Raw Straw <onboarding@resend.dev>";
    const subject = data.isRefund 
      ? `Remboursement de votre commande #${data.orderId.slice(-8).toUpperCase()} 💰`
      : `Annulation de votre commande #${data.orderId.slice(-8).toUpperCase()}`;
    
    logStep('Sending email', { to: data.customerEmail, from: fromEmail, subject });
    
    const emailResponse = await resend.emails.send({
      from: fromEmail,
      to: [data.customerEmail],
      subject: subject,
      html: html,
    });

    logStep('Email sent successfully', { emailId: emailResponse.data?.id });

    return new Response(
      JSON.stringify({
        success: true,
        emailId: emailResponse.data?.id,
        message: 'Cancellation/refund email sent successfully'
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    logStep('Error sending cancellation email', { error: error.message });
    
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
