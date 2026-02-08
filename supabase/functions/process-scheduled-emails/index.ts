import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const now = new Date().toISOString();
    console.log(`[${now}] Processing scheduled emails...`);

    const { data: scheduledEmails, error: fetchError } = await supabase
      .from("scheduled_emails")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", now)
      .limit(10);

    if (fetchError) {
      console.error("Error fetching scheduled emails:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${scheduledEmails?.length || 0} emails to process`);

    const results = [];

    for (const email of scheduledEmails || []) {
      try {
        console.log(`Processing email ${email.id} for ${email.recipient_email}`);

        const functionName = `send-${email.template_name}`;
        const emailData = {
          ...(email.email_data || {}),
          customerEmail: email.recipient_email,
          customerName: email.recipient_name || "Client",
        };

        const { data: sendResult, error: sendError } = await supabase.functions.invoke(functionName, {
          body: emailData,
        });

        if (sendError) throw sendError;

        if (sendResult?.success) {
          await supabase.from("scheduled_emails").update({
            status: "sent", sent_at: new Date().toISOString(),
          }).eq("id", email.id);
          results.push({ id: email.id, status: "sent" });
          console.log(`Email ${email.id} sent successfully`);
        } else {
          throw new Error(sendResult?.error || "Unknown error");
        }
      } catch (emailError: any) {
        console.error(`Error processing email ${email.id}:`, emailError);
        await supabase.from("scheduled_emails").update({
          status: "failed", error_message: emailError.message || "Unknown error",
        }).eq("id", email.id);
        results.push({ id: email.id, status: "failed", error: emailError.message });
      }
    }

    console.log(`Processed ${results.length} emails`);

    return new Response(
      JSON.stringify({ success: true, processed: results.length, results }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in process-scheduled-emails:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
