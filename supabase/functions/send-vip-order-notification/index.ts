import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VipOrderPayload {
  order_id: string;
  customer_email: string;
  customer_name: string;
  order_total: number;
  threshold: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: VipOrderPayload = await req.json();
    console.log('Processing VIP order notification:', payload);

    // Get business rules to find VIP contact email
    const { data: settingsData } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'business_rules')
      .single();

    const businessRules = settingsData?.setting_value as any || {};
    const vipEmail = businessRules?.contact?.vipEmail || 'vip@rifrawstraw.com';

    const orderNumber = payload.order_id.slice(-8);
    const formattedTotal = `${payload.order_total.toFixed(2)} €`;
    const formattedThreshold = `${payload.threshold.toFixed(2)} €`;

    // Send notification to VIP admin email
    const adminEmailResponse = await resend.emails.send({
      from: "Rif Raw Straw <notifications@rifrawstraw.com>",
      to: [vipEmail],
      subject: `🌟 Commande VIP #${orderNumber} - ${formattedTotal}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px; background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); padding: 20px; border-radius: 12px;">
            <h1 style="color: #333; margin: 0;">🌟 Nouvelle Commande VIP</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #FFD700;">
            <h3 style="margin-top: 0; color: #333;">Détails de la commande</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0;"><strong>Numéro:</strong></td><td>#${orderNumber}</td></tr>
              <tr><td style="padding: 8px 0;"><strong>Client:</strong></td><td>${payload.customer_name}</td></tr>
              <tr><td style="padding: 8px 0;"><strong>Email:</strong></td><td>${payload.customer_email}</td></tr>
              <tr><td style="padding: 8px 0;"><strong>Montant:</strong></td><td style="font-size: 1.2em; font-weight: bold; color: #2c5530;">${formattedTotal}</td></tr>
              <tr><td style="padding: 8px 0;"><strong>Seuil VIP:</strong></td><td>${formattedThreshold}</td></tr>
            </table>
          </div>
          
          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #856404;">
              <strong>⚠️ Action recommandée:</strong> Cette commande dépasse le seuil VIP. 
              Envisagez un suivi personnalisé ou un contact direct avec le client.
            </p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5; text-align: center; color: #666;">
            <p style="font-size: 12px;">Email automatique - Système de notification VIP Rif Raw Straw</p>
          </div>
        </div>
      `,
    });

    console.log("VIP notification email sent:", adminEmailResponse);

    // Log this notification in audit_logs
    await supabase.from('audit_logs').insert({
      action: 'VIP_ORDER_NOTIFICATION_SENT',
      resource_type: 'order',
      resource_id: payload.order_id,
      new_values: {
        order_total: payload.order_total,
        threshold: payload.threshold,
        customer_email: payload.customer_email,
        notification_sent_to: vipEmail
      }
    });

    return new Response(JSON.stringify({
      success: true,
      emailId: adminEmailResponse.data?.id,
      order_id: payload.order_id,
      notified_email: vipEmail
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-vip-order-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
