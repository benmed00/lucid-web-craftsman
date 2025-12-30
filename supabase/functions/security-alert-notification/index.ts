import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Admin emails to notify
const ADMIN_EMAILS = [
  "benyakoub.dev+rifstraw@gmail.com",
  "benyakoub.fr+rifstraw@gmail.com"
];

interface SecurityAlert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  source_ip: string | null;
  user_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

const getSeverityColor = (severity: string): string => {
  switch (severity) {
    case 'critical': return '#dc2626';
    case 'high': return '#ea580c';
    case 'medium': return '#ca8a04';
    default: return '#2563eb';
  }
};

const getSeverityEmoji = (severity: string): string => {
  switch (severity) {
    case 'critical': return '🚨';
    case 'high': return '⚠️';
    case 'medium': return '⚡';
    default: return 'ℹ️';
  }
};

const generateAlertEmailHtml = (alerts: SecurityAlert[]): string => {
  const alertsHtml = alerts.map(alert => `
    <div style="border: 2px solid ${getSeverityColor(alert.severity)}; border-radius: 8px; padding: 16px; margin-bottom: 16px; background-color: #fafafa;">
      <div style="display: flex; align-items: center; margin-bottom: 8px;">
        <span style="font-size: 24px; margin-right: 8px;">${getSeverityEmoji(alert.severity)}</span>
        <span style="background-color: ${getSeverityColor(alert.severity)}; color: white; padding: 4px 12px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 12px;">
          ${alert.severity}
        </span>
      </div>
      <h3 style="margin: 8px 0; color: #1f2937; font-size: 18px;">${alert.title}</h3>
      <p style="color: #4b5563; margin: 8px 0;">${alert.description}</p>
      <div style="font-size: 13px; color: #6b7280; margin-top: 12px; border-top: 1px solid #e5e7eb; padding-top: 12px;">
        <p style="margin: 4px 0;"><strong>Type:</strong> ${alert.alert_type}</p>
        ${alert.source_ip ? `<p style="margin: 4px 0;"><strong>IP Source:</strong> ${alert.source_ip}</p>` : ''}
        ${alert.user_id ? `<p style="margin: 4px 0;"><strong>User ID:</strong> ${alert.user_id}</p>` : ''}
        <p style="margin: 4px 0;"><strong>Détecté à:</strong> ${new Date(alert.created_at).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}</p>
      </div>
    </div>
  `).join('');

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const highCount = alerts.filter(a => a.severity === 'high').length;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f3f4f6;">
      <div style="background-color: #1f2937; color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">🔐 Alerte Sécurité - Rif Straw</h1>
        <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 14px;">
          ${alerts.length} alerte(s) de sécurité détectée(s)
        </p>
      </div>
      
      <div style="background-color: white; padding: 24px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap;">
          ${criticalCount > 0 ? `<span style="background-color: #dc2626; color: white; padding: 6px 12px; border-radius: 4px; font-size: 13px;">${criticalCount} Critique(s)</span>` : ''}
          ${highCount > 0 ? `<span style="background-color: #ea580c; color: white; padding: 6px 12px; border-radius: 4px; font-size: 13px;">${highCount} Haute(s)</span>` : ''}
        </div>
        
        ${alertsHtml}
        
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center;">
          <a href="https://id-preview--1ed5c182-2490-4180-9969-ca6a7e19e8ca.lovable.app/admin/settings" 
             style="display: inline-block; background-color: #1f2937; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
            Voir le Dashboard Admin
          </a>
        </div>
        
        <p style="margin-top: 24px; font-size: 12px; color: #9ca3af; text-align: center;">
          Cet email a été envoyé automatiquement par le système de sécurité Rif Straw.<br>
          Ne pas répondre à cet email.
        </p>
      </div>
    </body>
    </html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  console.log("Security alert notification function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get pending alerts
    const { data: alerts, error: fetchError } = await supabase
      .rpc('get_pending_security_alerts');

    if (fetchError) {
      console.error("Error fetching pending alerts:", fetchError);
      throw fetchError;
    }

    if (!alerts || alerts.length === 0) {
      console.log("No pending alerts to send");
      return new Response(
        JSON.stringify({ success: true, message: "No pending alerts" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Found ${alerts.length} pending security alerts`);

    // Send email notification
    const emailHtml = generateAlertEmailHtml(alerts);
    const criticalCount = alerts.filter((a: SecurityAlert) => a.severity === 'critical').length;
    const subject = criticalCount > 0 
      ? `🚨 [CRITIQUE] ${alerts.length} Alerte(s) Sécurité - Rif Straw`
      : `⚠️ ${alerts.length} Alerte(s) Sécurité - Rif Straw`;

    const emailResponse = await resend.emails.send({
      from: "Rif Straw Security <onboarding@resend.dev>",
      to: ADMIN_EMAILS,
      subject: subject,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    // Mark alerts as notified
    const alertIds = alerts.map((a: SecurityAlert) => a.id);
    const { error: updateError } = await supabase
      .rpc('mark_alerts_notified', { alert_ids: alertIds });

    if (updateError) {
      console.error("Error marking alerts as notified:", updateError);
      // Don't throw, email was already sent
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        alertsProcessed: alerts.length,
        emailResponse 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in security-alert-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
