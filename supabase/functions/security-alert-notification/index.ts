import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@rifelegance.com";
const FROM_NAME = "Sécurité Rif Raw Straw";
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_EMAIL = "ben94med@gmail.com";

interface SecurityAlert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  source_ip: string;
  user_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
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

serve(async (req: Request): Promise<Response> => {
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

    console.log("[Security Alert] Starting alert notification process...");

    const { data: alerts, error: fetchError } = await supabase.rpc("get_pending_security_alerts");
    if (fetchError) throw fetchError;

    console.log(`[Security Alert] Found ${alerts?.length || 0} pending alerts`);

    if (!alerts || alerts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No pending alerts" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const alertsHtml = (alerts as SecurityAlert[]).map((alert) => `
      <div style="border-left: 4px solid ${
        alert.severity === "critical" ? "#dc2626" : alert.severity === "high" ? "#f59e0b" : "#3b82f6"
      }; padding: 16px; margin: 16px 0; background: #f9fafb; border-radius: 0 8px 8px 0;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-weight: bold; color: ${
            alert.severity === "critical" ? "#dc2626" : alert.severity === "high" ? "#f59e0b" : "#3b82f6"
          }; text-transform: uppercase; font-size: 12px;">${alert.severity}</span>
          <span style="color: #6b7280; font-size: 12px;">${new Date(alert.created_at).toLocaleString("fr-FR")}</span>
        </div>
        <h3 style="margin: 0 0 8px; color: #111827; font-size: 16px;">${alert.title}</h3>
        <p style="margin: 0 0 8px; color: #4b5563; font-size: 14px;">${alert.description}</p>
        <div style="font-size: 12px; color: #6b7280;">
          <p style="margin: 4px 0;">Type: <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px;">${alert.alert_type}</code></p>
          <p style="margin: 4px 0;">IP: <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px;">${alert.source_ip || "N/A"}</code></p>
          ${alert.user_id ? `<p style="margin: 4px 0;">User: <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px;">${alert.user_id}</code></p>` : ""}
        </div>
      </div>`).join("");

    const criticalCount = alerts.filter((a: SecurityAlert) => a.severity === "critical").length;
    const highCount = alerts.filter((a: SecurityAlert) => a.severity === "high").length;

    const emailHtml = `<!DOCTYPE html><html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #dc2626, #f59e0b); padding: 24px; border-radius: 12px; margin-bottom: 24px;">
        <h1 style="color: white; margin: 0;">🚨 Alertes de Sécurité</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0;">${criticalCount} critique(s), ${highCount} haute(s)</p>
      </div>
      <p style="color: #374151;">Les alertes suivantes nécessitent votre attention :</p>
      ${alertsHtml}
      <div style="margin-top: 24px; padding: 16px; background: #fef3c7; border-radius: 8px;">
        <p style="margin: 0; color: #92400e;"><strong>Action requise:</strong> Vérifiez dans le dashboard admin.</p>
      </div>
      <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 12px; text-align: center;">Email automatique - Système de sécurité.</p>
    </body></html>`;

    console.log("[Security Alert] Sending email via Brevo...");
    const emailResult = await sendBrevoEmail(ADMIN_EMAIL, `🚨 [URGENT] ${criticalCount + highCount} Alerte(s) de Sécurité`, emailHtml);
    console.log("[Security Alert] Email sent:", emailResult);

    // Log to email_logs for traceability
    await supabase.from('email_logs').insert({
      template_name: 'security-alert-notification',
      recipient_email: ADMIN_EMAIL,
      recipient_name: 'Security Admin',
      status: 'sent',
      metadata: { messageId: emailResult.messageId, alertCount: alerts.length, criticalCount, highCount },
      sent_at: new Date().toISOString()
    });

    const alertIds = alerts.map((a: SecurityAlert) => a.id);
    const { error: updateError } = await supabase.rpc("mark_alerts_notified", { alert_ids: alertIds });
    if (updateError) console.error("[Security Alert] Error marking alerts:", updateError);

    return new Response(
      JSON.stringify({ success: true, alertsProcessed: alerts.length, emailResponse: emailResult }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("[Security Alert] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
