import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DiscountCoupon {
  id: string; code: string; type: string; value: number;
  valid_until: string | null; usage_limit: number | null;
  usage_count: number; is_active: boolean;
}

interface AlertConfig {
  days_before_expiry: number;
  usage_threshold_percent: number;
  admin_email: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("check-promo-alerts function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate caller is an authenticated admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const userId = claimsData.claims.sub;
    const { data: isAdmin } = await supabase.rpc("is_admin_user", { user_uuid: userId });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden - Admin access required" }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const resend = new Resend(resendApiKey);

    let config: AlertConfig = {
      days_before_expiry: 3,
      usage_threshold_percent: 80,
      admin_email: "admin@douar-artisan.com",
    };

    if (req.method === "POST") {
      const body = await req.json();
      config = { ...config, ...body };
    }

    console.log("Using config:", config);

    const { data: coupons, error: fetchError } = await supabase
      .from("discount_coupons").select("*").eq("is_active", true);

    if (fetchError) throw fetchError;

    console.log(`Found ${coupons?.length || 0} active coupons`);

    const now = new Date();
    const alertThreshold = new Date();
    alertThreshold.setDate(alertThreshold.getDate() + config.days_before_expiry);

    const expiringCoupons: DiscountCoupon[] = [];
    const nearLimitCoupons: DiscountCoupon[] = [];

    for (const coupon of coupons || []) {
      if (coupon.valid_until) {
        const expiryDate = new Date(coupon.valid_until);
        if (expiryDate > now && expiryDate <= alertThreshold) {
          expiringCoupons.push(coupon);
        }
      }
      if (coupon.usage_limit && coupon.usage_limit > 0) {
        const usagePercent = (coupon.usage_count / coupon.usage_limit) * 100;
        if (usagePercent >= config.usage_threshold_percent && usagePercent < 100) {
          nearLimitCoupons.push(coupon);
        }
      }
    }

    const alerts = {
      expiring: expiringCoupons.length,
      nearLimit: nearLimitCoupons.length,
      total: expiringCoupons.length + nearLimitCoupons.length,
    };

    if (alerts.total > 0) {
      const expiringList = expiringCoupons.map((c) => {
        const days = Math.ceil((new Date(c.valid_until!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return `<li><strong>${c.code}</strong> - Expire dans ${days} jour(s)</li>`;
      }).join("");

      const nearLimitList = nearLimitCoupons.map((c) => {
        const percent = ((c.usage_count / c.usage_limit!) * 100).toFixed(1);
        return `<li><strong>${c.code}</strong> - ${c.usage_count}/${c.usage_limit} (${percent}%)</li>`;
      }).join("");

      const emailHtml = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>🎟️ Alertes Codes Promo</h1>
        ${expiringCoupons.length > 0 ? `<h2 style="color: #e74c3c;">⏰ Expirant bientôt (${expiringCoupons.length})</h2><ul>${expiringList}</ul>` : ""}
        ${nearLimitCoupons.length > 0 ? `<h2 style="color: #f39c12;">📊 Limite d'utilisation (${nearLimitCoupons.length})</h2><ul>${nearLimitList}</ul>` : ""}
      </div>`;

      try {
        await resend.emails.send({
          from: "Douar Artisan <onboarding@resend.dev>",
          to: [config.admin_email],
          subject: `[Alertes Promo] ${alerts.total} code(s) nécessitent attention`,
          html: emailHtml,
        });
      } catch (emailError) {
        console.error("Error sending email:", emailError);
      }
    }

    await supabase.from("audit_logs").insert({
      action: "PROMO_ALERT_CHECK", resource_type: "discount_coupons", resource_id: "system",
      new_values: { expiring_count: expiringCoupons.length, near_limit_count: nearLimitCoupons.length, config },
    });

    return new Response(
      JSON.stringify({
        success: true, alerts,
        expiringCoupons: expiringCoupons.map((c) => ({ code: c.code, expiresAt: c.valid_until })),
        nearLimitCoupons: nearLimitCoupons.map((c) => ({ code: c.code, usage: `${c.usage_count}/${c.usage_limit}` })),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in check-promo-alerts:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
