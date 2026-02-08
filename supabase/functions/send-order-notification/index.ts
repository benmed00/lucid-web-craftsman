import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface OrderNotificationRequest {
  order_id: string;
  status: string;
  customer_email: string;
  customer_name: string;
  order_total: number;
  currency: string;
}

const getStatusText = (status: string): string => {
  const statusMap: { [key: string]: string } = {
    'pending': 'En attente de paiement',
    'paid': 'Payée',
    'processing': 'En préparation',
    'shipped': 'Expédiée',
    'delivered': 'Livrée',
    'cancelled': 'Annulée'
  };
  return statusMap[status] || status;
};

const getEmailContent = (status: string, orderData: OrderNotificationRequest): { subject: string; html: string } => {
  const statusText = getStatusText(status);
  const formattedTotal = `${orderData.order_total.toFixed(2)} ${orderData.currency}`;
  
  switch (status) {
    case 'paid':
      return {
        subject: `Confirmation de commande #${orderData.order_id.slice(-8)}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2c5530;">Merci pour votre commande !</h2>
            <p>Bonjour ${orderData.customer_name},</p>
            <p>Nous avons bien reçu votre paiement et votre commande est confirmée.</p>
            <div style="background: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3>Détails de la commande</h3>
              <p><strong>Numéro de commande:</strong> #${orderData.order_id.slice(-8)}</p>
              <p><strong>Montant:</strong> ${formattedTotal}</p>
              <p><strong>Statut:</strong> ${statusText}</p>
            </div>
            <p>Nous préparons votre commande et vous tiendrons informé de son évolution.</p>
            <p>Cordialement,<br>L'équipe Rif Raw Straw</p>
          </div>
        `
      };
    case 'processing':
      return {
        subject: `Votre commande #${orderData.order_id.slice(-8)} est en préparation`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2c5530;">Votre commande est en préparation</h2>
            <p>Bonjour ${orderData.customer_name},</p>
            <p>Bonne nouvelle ! Votre commande #${orderData.order_id.slice(-8)} est actuellement en préparation dans nos ateliers.</p>
            <p>Nos artisans s'affairent à préparer vos produits avec le plus grand soin.</p>
            <p>Vous recevrez une notification dès que votre commande sera expédiée.</p>
            <p>Cordialement,<br>L'équipe Rif Raw Straw</p>
          </div>
        `
      };
    case 'shipped':
      return {
        subject: `Votre commande #${orderData.order_id.slice(-8)} a été expédiée`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2c5530;">Votre commande est en route !</h2>
            <p>Bonjour ${orderData.customer_name},</p>
            <p>Excellente nouvelle ! Votre commande #${orderData.order_id.slice(-8)} vient d'être expédiée.</p>
            <p>Vous devriez recevoir vos produits artisanaux dans les prochains jours.</p>
            <p>Un numéro de suivi vous sera communiqué séparément si applicable.</p>
            <p>Nous espérons que vous serez ravi de vos achats !</p>
            <p>Cordialement,<br>L'équipe Rif Raw Straw</p>
          </div>
        `
      };
    case 'delivered':
      return {
        subject: `Votre commande #${orderData.order_id.slice(-8)} a été livrée`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2c5530;">Commande livrée avec succès !</h2>
            <p>Bonjour ${orderData.customer_name},</p>
            <p>Votre commande #${orderData.order_id.slice(-8)} a été livrée avec succès !</p>
            <p>Nous espérons que vous êtes satisfait de vos produits artisanaux.</p>
            <p>N'hésitez pas à laisser un avis sur notre site ou à nous contacter si vous avez des questions.</p>
            <p>Merci de votre confiance !</p>
            <p>Cordialement,<br>L'équipe Rif Raw Straw</p>
          </div>
        `
      };
    default:
      return {
        subject: `Mise à jour de votre commande #${orderData.order_id.slice(-8)}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2c5530;">Mise à jour de commande</h2>
            <p>Bonjour ${orderData.customer_name},</p>
            <p>Le statut de votre commande #${orderData.order_id.slice(-8)} a été mis à jour.</p>
            <p><strong>Nouveau statut:</strong> ${statusText}</p>
            <p>Cordialement,<br>L'équipe Rif Raw Straw</p>
          </div>
        `
      };
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate caller is an authenticated admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Verify admin role
    const userId = claimsData.claims.sub;
    const adminCheck = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: isAdmin } = await adminCheck.rpc("is_admin_user", { user_uuid: userId });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden - Admin access required" }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const orderData: OrderNotificationRequest = await req.json();
    
    console.log('Sending order notification:', {
      order_id: orderData.order_id,
      status: orderData.status,
      customer_email: orderData.customer_email
    });

    const { subject, html } = getEmailContent(orderData.status, orderData);

    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Rif Raw Straw <onboarding@resend.dev>";
    
    const emailResponse = await resend.emails.send({
      from: fromEmail,
      to: [orderData.customer_email],
      subject: subject,
      html: html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({
      success: true,
      emailId: emailResponse.data?.id
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-order-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
