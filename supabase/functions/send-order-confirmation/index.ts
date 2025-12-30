import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import * as React from 'npm:react@18.3.1';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { OrderConfirmationEmail } from './_templates/order-confirmation.tsx';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
}

const logStep = (step: string, details?: any) => {
  console.log(`[send-order-confirmation] ${step}`, details ? JSON.stringify(details) : '');
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Starting order confirmation email send');
    
    const data: OrderConfirmationRequest = await req.json();
    
    logStep('Received order data', {
      orderId: data.orderId,
      customerEmail: data.customerEmail,
      itemCount: data.items?.length || 0,
      total: data.total
    });

    // Validate required fields
    if (!data.orderId || !data.customerEmail || !data.customerName) {
      throw new Error('Missing required fields: orderId, customerEmail, or customerName');
    }

    // Format order date
    const orderDate = new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    // Estimate delivery (5-7 business days)
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 7);
    const estimatedDelivery = `${deliveryDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`;

    // Render React Email template
    logStep('Rendering email template');
    
    const html = await renderAsync(
      React.createElement(OrderConfirmationEmail, {
        customerName: data.customerName,
        orderNumber: data.orderId.slice(-8).toUpperCase(),
        orderDate: orderDate,
        items: data.items || [],
        subtotal: data.subtotal || 0,
        shipping: data.shipping || 0,
        discount: data.discount || 0,
        total: data.total || 0,
        currency: data.currency || 'EUR',
        shippingAddress: data.shippingAddress || {
          address: '',
          city: '',
          postalCode: '',
          country: 'France'
        },
        estimatedDelivery: estimatedDelivery
      })
    );

    logStep('Email template rendered successfully');

    // Send email via Resend
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Rif Raw Straw <onboarding@resend.dev>";
    
    logStep('Sending email', { to: data.customerEmail, from: fromEmail });
    
    const emailResponse = await resend.emails.send({
      from: fromEmail,
      to: [data.customerEmail],
      subject: `Confirmation de commande #${data.orderId.slice(-8).toUpperCase()} - Rif Raw Straw`,
      html: html,
    });

    logStep('Email sent successfully', { emailId: emailResponse.data?.id });

    return new Response(
      JSON.stringify({
        success: true,
        emailId: emailResponse.data?.id,
        message: 'Order confirmation email sent successfully'
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    logStep('Error sending order confirmation', { error: error.message });
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
};

serve(handler);
