import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const FROM_NAME = "Rif Raw Straw";
const parseFromEmail = (raw: string | undefined): string => {
  if (!raw) return "noreply@rifelegance.com";
  const match = raw.match(/<([^>]+)>/);
  return match ? match[1].trim() : raw.trim();
};
const FROM_EMAIL = parseFromEmail(Deno.env.get("RESEND_FROM_EMAIL"));
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface VipOrderPayload {
  order_id: string;
  customer_email: string;
  customer_name: string;
  order_total: number;
  threshold: number;
}

const sendBrevoEmail = async (to: string, subject: string, htmlContent: string): Promise<{ messageId?: string }> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": BREVO_API_KEY!, "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: { name: FROM_NAME, email: FROM_EMAIL.replace(/.*<(.+)>/, '$1').trim() || FROM_EMAIL },
        to: [{ email: to }],
        subject,
        htmlContent,
      }),
      signal: controller.signal,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`Brevo error (${res.status}): ${JSON.stringify(data)}`);
    return { messageId: data.messageId };
  } finally {
    clearTimeout(timeout);
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
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
      const { data: isAdmin } = await supabase.rpc("is_admin_user", { user_uuid: userId });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden - Admin access required" }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
    }

    const payload: VipOrderPayload = await req.json();
    console.log('Processing VIP order notification:', payload);

    // Idempotency check
    const { data: existingLog } = await supabase
      .from('email_logs').select('id')
      .eq('order_id', payload.order_id)
      .eq('template_name', 'vip-order-notification')
      .eq('status', 'sent').maybeSingle();

    if (existingLog) {
      console.log('VIP notification already sent (idempotent)');
      return new Response(JSON.stringify({ success: true, message: "Already sent" }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const { data: settingsData } = await supabase
      .from('app_settings').select('setting_value').eq('setting_key', 'business_rules').single();

    const businessRules = settingsData?.setting_value as any || {};
    const vipEmail = businessRules?.contact?.vipEmail || 'vip@rifrawstraw.com';

    const orderNumber = payload.order_id.slice(-8);
    const formattedTotal = `${payload.order_total.toFixed(2)} €`;
    const formattedThreshold = `${payload.threshold.toFixed(2)} €`;

    const emailHtml = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px; background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); padding: 20px; border-radius: 12px;">
          <h1 style="color: #333; margin: 0;">🌟 Nouvelle Commande VIP</h1>
        </div>
        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #FFD700;">
          <h3 style="margin-top: 0;">Détails</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0;"><strong>Numéro:</strong></td><td>#${orderNumber}</td></tr>
            <tr><td style="padding: 8px 0;"><strong>Client:</strong></td><td>${payload.customer_name}</td></tr>
            <tr><td style="padding: 8px 0;"><strong>Email:</strong></td><td>${payload.customer_email}</td></tr>
            <tr><td style="padding: 8px 0;"><strong>Montant:</strong></td><td style="font-weight: bold; color: #2c5530;">${formattedTotal}</td></tr>
            <tr><td style="padding: 8px 0;"><strong>Seuil VIP:</strong></td><td>${formattedThreshold}</td></tr>
          </table>
        </div>
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px;">
          <p style="margin: 0; color: #856404;"><strong>⚠️ Action recommandée:</strong> Suivi personnalisé recommandé.</p>
        </div>
      </div>`;

    const emailResult = await sendBrevoEmail(vipEmail, `🌟 Commande VIP #${orderNumber} - ${formattedTotal}`, emailHtml);
    console.log("VIP notification sent:", emailResult);

    // Log to email_logs for traceability
    await supabase.from('email_logs').insert({
      template_name: 'vip-order-notification',
      recipient_email: vipEmail,
      recipient_name: 'VIP Admin',
      order_id: payload.order_id,
      status: 'sent',
      metadata: { messageId: emailResult.messageId, order_total: payload.order_total, threshold: payload.threshold },
      sent_at: new Date().toISOString()
    });

    await supabase.from('audit_logs').insert({
      action: 'VIP_ORDER_NOTIFICATION_SENT', resource_type: 'order', resource_id: payload.order_id,
      new_values: {
        order_total: payload.order_total, threshold: payload.threshold,
        customer_email: payload.customer_email, notification_sent_to: vipEmail
      }
    });

    return new Response(JSON.stringify({
      success: true, emailId: emailResult.messageId,
      order_id: payload.order_id, notified_email: vipEmail
    }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (error: any) {
    console.error("Error in send-vip-order-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
