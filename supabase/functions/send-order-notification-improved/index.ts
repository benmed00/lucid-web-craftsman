import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Create a Supabase client with service role key for server-side operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderNotificationPayload {
  order_id: string;
  old_status?: string;
  new_status: string;
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

const getEmailContent = (status: string, orderData: any): { subject: string; html: string } => {
  const statusText = getStatusText(status);
  const formattedTotal = `${(orderData.amount / 100).toFixed(2)} ${orderData.currency.toUpperCase()}`;
  const orderNumber = orderData.id.slice(-8);
  
  switch (status) {
    case 'paid':
      return {
        subject: `Confirmation de commande #${orderNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2c5530; margin-bottom: 10px;">Merci pour votre commande !</h1>
              <div style="width: 50px; height: 3px; background: #2c5530; margin: 0 auto;"></div>
            </div>
            
            <p>Bonjour ${orderData.customer_name},</p>
            <p>Nous avons bien reçu votre paiement et votre commande est confirmée.</p>
            
            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2c5530;">
              <h3 style="margin-top: 0; color: #2c5530;">Détails de la commande</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 5px 0;"><strong>Numéro de commande:</strong></td><td>#${orderNumber}</td></tr>
                <tr><td style="padding: 5px 0;"><strong>Montant total:</strong></td><td>${formattedTotal}</td></tr>
                <tr><td style="padding: 5px 0;"><strong>Statut:</strong></td><td>${statusText}</td></tr>
                <tr><td style="padding: 5px 0;"><strong>Date:</strong></td><td>${new Date(orderData.created_at).toLocaleDateString('fr-FR')}</td></tr>
              </table>
            </div>
            
            <p>Nous préparons votre commande avec le plus grand soin. Vous recevrez une notification dès que votre commande sera expédiée.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5; text-align: center; color: #666;">
              <p style="margin-bottom: 5px;">Cordialement,</p>
              <p style="font-weight: bold; color: #2c5530;">L'équipe Rif Raw Straw</p>
              <p style="font-size: 12px; margin-top: 15px;">Artisanat authentique du Maroc</p>
            </div>
          </div>
        `
      };
      
    case 'processing':
      return {
        subject: `Votre commande #${orderNumber} est en préparation`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2c5530; margin-bottom: 10px;">Votre commande est en préparation</h1>
              <div style="width: 50px; height: 3px; background: #2c5530; margin: 0 auto;"></div>
            </div>
            
            <p>Bonjour ${orderData.customer_name},</p>
            <p>Bonne nouvelle ! Votre commande #${orderNumber} est actuellement en préparation dans nos ateliers.</p>
            
            <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 10px;">🎨</div>
              <p style="margin: 0; font-style: italic; color: #2c5530;">Nos artisans s'affairent à préparer vos produits avec le plus grand soin.</p>
            </div>
            
            <p>Vous recevrez une notification dès que votre commande sera expédiée.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5; text-align: center; color: #666;">
              <p>Cordialement,<br><strong style="color: #2c5530;">L'équipe Rif Raw Straw</strong></p>
            </div>
          </div>
        `
      };
      
    case 'shipped':
      return {
        subject: `📦 Votre commande #${orderNumber} a été expédiée`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2c5530; margin-bottom: 10px;">Votre commande est en route !</h1>
              <div style="width: 50px; height: 3px; background: #2c5530; margin: 0 auto;"></div>
            </div>
            
            <p>Bonjour ${orderData.customer_name},</p>
            <p>Excellente nouvelle ! Votre commande #${orderNumber} vient d'être expédiée.</p>
            
            <div style="background: linear-gradient(135deg, #e8f5e8 0%, #d4e9d4 100%); padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 10px;">🚚</div>
              <p style="margin: 0; font-weight: bold; color: #2c5530;">Vos produits artisanaux sont maintenant en chemin !</p>
            </div>
            
            <p>Vous devriez recevoir vos produits dans les prochains jours. Un numéro de suivi vous sera communiqué séparément si applicable.</p>
            <p>Nous espérons que vous serez ravi de vos achats !</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5; text-align: center; color: #666;">
              <p>Cordialement,<br><strong style="color: #2c5530;">L'équipe Rif Raw Straw</strong></p>
            </div>
          </div>
        `
      };
      
    case 'delivered':
      return {
        subject: `✅ Votre commande #${orderNumber} a été livrée`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2c5530; margin-bottom: 10px;">Commande livrée avec succès !</h1>
              <div style="width: 50px; height: 3px; background: #2c5530; margin: 0 auto;"></div>
            </div>
            
            <p>Bonjour ${orderData.customer_name},</p>
            <p>Votre commande #${orderNumber} a été livrée avec succès !</p>
            
            <div style="background: linear-gradient(135deg, #fff4e6 0%, #ffe8cc 100%); padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 10px;">🎉</div>
              <p style="margin: 0; font-weight: bold; color: #b8860b;">Nous espérons que vous êtes satisfait de vos produits artisanaux !</p>
            </div>
            
            <p>N'hésitez pas à laisser un avis sur notre site ou à nous contacter si vous avez des questions.</p>
            <p><strong>Merci de votre confiance !</strong></p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5; text-align: center; color: #666;">
              <p>Cordialement,<br><strong style="color: #2c5530;">L'équipe Rif Raw Straw</strong></p>
            </div>
          </div>
        `
      };
      
    default:
      return {
        subject: `Mise à jour de votre commande #${orderNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2c5530;">Mise à jour de commande</h2>
            <p>Bonjour ${orderData.customer_name},</p>
            <p>Le statut de votre commande #${orderNumber} a été mis à jour.</p>
            <p><strong>Nouveau statut:</strong> ${statusText}</p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5; text-align: center; color: #666;">
              <p>Cordialement,<br><strong style="color: #2c5530;">L'équipe Rif Raw Straw</strong></p>
            </div>
          </div>
        `
      };
  }
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: OrderNotificationPayload = await req.json();
    console.log('Processing order notification:', payload);

    // Get order details with customer information
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        profiles!orders_user_id_fkey (
          full_name
        )
      `)
      .eq('id', payload.order_id)
      .single();

    if (orderError) {
      console.error('Error fetching order:', orderError);
      throw new Error(`Order not found: ${orderError.message}`);
    }

    // Get customer email using auth.users (requires service role)
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(orderData.user_id);
    
    if (userError || !user) {
      console.error('Error fetching user:', userError);
      throw new Error(`User not found: ${userError?.message || 'Unknown error'}`);
    }

    const customerName = orderData.profiles?.full_name || user.user_metadata?.full_name || 'Client';
    const customerEmail = user.email;

    if (!customerEmail) {
      throw new Error('Customer email not found');
    }

    // Prepare order data for email
    const emailOrderData = {
      ...orderData,
      customer_name: customerName,
      customer_email: customerEmail
    };

    const { subject, html } = getEmailContent(payload.new_status, emailOrderData);

    console.log(`Sending email to ${customerEmail} for order ${payload.order_id} status change to ${payload.new_status}`);

    const emailResponse = await resend.emails.send({
      from: "Rif Raw Straw <commandes@rifrawstraw.com>",
      to: [customerEmail],
      subject: subject,
      html: html,
    });

    console.log("Order notification email sent successfully:", emailResponse);

    return new Response(JSON.stringify({
      success: true,
      emailId: emailResponse.data?.id,
      order_id: payload.order_id,
      status: payload.new_status
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-order-notification-improved function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);