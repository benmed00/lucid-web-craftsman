import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PAYPAL] ${step}${detailsStr}`);
};

// Get PayPal API base URL
const getPayPalBaseUrl = () => {
  const mode = Deno.env.get("PAYPAL_MODE") || "sandbox";
  return mode === "live" 
    ? "https://api-m.paypal.com" 
    : "https://api-m.sandbox.paypal.com";
};

// Get PayPal access token
const getAccessToken = async (): Promise<string> => {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  
  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials not configured");
  }

  const auth = btoa(`${clientId}:${clientSecret}`);
  
  const response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get PayPal access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseService = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const { paypal_order_id, order_id } = await req.json();
    
    logStep("Verifying PayPal payment", { paypal_order_id, order_id });

    if (!paypal_order_id) {
      throw new Error("PayPal order ID is required");
    }

    // Get PayPal access token
    const accessToken = await getAccessToken();

    // Get PayPal order details
    const orderResponse = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders/${paypal_order_id}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      }
    });

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      logStep("Failed to get PayPal order", { error: errorText });
      throw new Error(`Failed to get PayPal order: ${errorText}`);
    }

    const paypalOrder = await orderResponse.json();
    logStep("PayPal order status", { status: paypalOrder.status });

    // If order is APPROVED, capture the payment
    if (paypalOrder.status === "APPROVED") {
      logStep("Capturing PayPal payment");
      
      const captureResponse = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders/${paypal_order_id}/capture`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      });

      if (!captureResponse.ok) {
        const errorText = await captureResponse.text();
        logStep("Capture failed", { error: errorText });
        throw new Error(`PayPal capture failed: ${errorText}`);
      }

      const captureData = await captureResponse.json();
      logStep("Payment captured", { status: captureData.status });

      if (captureData.status === "COMPLETED") {
        // Get capture details
        const capture = captureData.purchase_units?.[0]?.payments?.captures?.[0];
        const payer = captureData.payer;

        // Update order status to paid
        const { error: updateError } = await supabaseService
          .from('orders')
          .update({
            status: 'paid',
            order_status: 'PAID',
            payment_reference: paypal_order_id,
            metadata: {
              paypal_order_id,
              paypal_capture_id: capture?.id,
              paypal_status: captureData.status,
              payer_email: payer?.email_address,
              payer_name: `${payer?.name?.given_name || ''} ${payer?.name?.surname || ''}`.trim(),
              payer_id: payer?.payer_id,
              captured_at: new Date().toISOString()
            }
          })
          .eq('id', order_id);

        if (updateError) {
          logStep("Error updating order", updateError);
          throw new Error(`Failed to update order: ${updateError.message}`);
        }

        // Create initial status history entry
        await supabaseService
          .from('order_status_history')
          .insert({
            order_id: order_id,
            previous_status: 'CREATED',
            new_status: 'PAID',
            changed_by: 'system',
            metadata: {
              payment_method: 'paypal',
              paypal_order_id,
              capture_id: capture?.id
            }
          });

        logStep("Order updated to paid", { orderId: order_id });

        // Send order confirmation email
        try {
          await supabaseService.functions.invoke('send-order-confirmation', {
            body: { order_id }
          });
          logStep("Confirmation email sent");
        } catch (emailError) {
          logStep("Email send failed (non-fatal)", emailError);
        }

        return new Response(JSON.stringify({
          success: true,
          status: "COMPLETED",
          order_id,
          transaction_id: capture?.id,
          message: "Payment verified and order processed"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    } else if (paypalOrder.status === "COMPLETED") {
      // Already captured
      return new Response(JSON.stringify({
        success: true,
        status: "COMPLETED",
        order_id,
        message: "Payment already completed"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Payment not completed
    return new Response(JSON.stringify({
      success: false,
      status: paypalOrder.status,
      message: `Payment status: ${paypalOrder.status}`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("PayPal verification error:", error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
