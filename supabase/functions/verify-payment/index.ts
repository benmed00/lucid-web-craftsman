import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-guest-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Helper logging function
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PAYMENT] ${step}${detailsStr}`);
};

// Generate a guest ID based on session/IP for tracking anonymous users
const generateGuestId = (sessionId: string, email?: string): string => {
  // Use first 8 chars of session + email hash if available
  const baseId = sessionId.slice(-12);
  if (email) {
    const emailHash = email.split('@')[0].slice(0, 4).toUpperCase();
    return `GUEST-${emailHash}-${baseId.slice(-6).toUpperCase()}`;
  }
  return `GUEST-${baseId.toUpperCase()}`;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Create Supabase service client (needs service role for stock updates)
  const supabaseService = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");
    
    // Capture request metadata
    const userAgent = req.headers.get("user-agent") || "Unknown";
    const clientIP = req.headers.get("x-forwarded-for")?.split(',')[0]?.trim() || 
                     req.headers.get("cf-connecting-ip") || 
                     req.headers.get("x-real-ip") ||
                     "Unknown";
    const acceptLanguage = req.headers.get("accept-language") || "";
    
    const { session_id } = await req.json();
    
    if (!session_id) {
      throw new Error("No session ID provided");
    }

    logStep("Verifying session", { sessionId: session_id, clientIP, userAgent: userAgent.slice(0, 50) });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve session from Stripe with expanded data
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['customer', 'payment_intent', 'line_items']
    });
    
    if (!session) {
      throw new Error("Session not found");
    }

    logStep("Session retrieved", { 
      paymentStatus: session.payment_status, 
      orderId: session.metadata?.order_id,
      customerEmail: session.customer_details?.email
    });

    // Only process if payment is complete
    if (session.payment_status !== 'paid') {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Payment not completed",
        status: session.payment_status
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Find the order using the session ID
    const { data: orderData, error: orderError } = await supabaseService
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          product_id,
          quantity,
          unit_price,
          total_price
        )
      `)
      .eq('stripe_session_id', session_id)
      .single();

    if (orderError || !orderData) {
      logStep("Order not found", { error: orderError });
      throw new Error("Order not found");
    }

    logStep("Order found", { orderId: orderData.id, status: orderData.status });

    // If order is already completed, return success
    if (orderData.status === 'paid' || orderData.status === 'completed') {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Order already processed",
        orderId: orderData.id
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Extract comprehensive customer data from Stripe session
    const customerDetails = session.customer_details;
    const shippingDetails = session.shipping_details;
    
    // Build shipping address from Stripe data
    const shippingAddress = shippingDetails?.address ? {
      first_name: shippingDetails.name?.split(' ')[0] || customerDetails?.name?.split(' ')[0] || '',
      last_name: shippingDetails.name?.split(' ').slice(1).join(' ') || customerDetails?.name?.split(' ').slice(1).join(' ') || '',
      email: customerDetails?.email || '',
      phone: customerDetails?.phone || shippingDetails?.phone || '',
      address_line1: shippingDetails.address.line1 || '',
      address_line2: shippingDetails.address.line2 || '',
      city: shippingDetails.address.city || '',
      postal_code: shippingDetails.address.postal_code || '',
      state: shippingDetails.address.state || '',
      country: shippingDetails.address.country || 'FR',
    } : null;

    // Build billing address from Stripe data
    const billingAddress = customerDetails?.address ? {
      first_name: customerDetails.name?.split(' ')[0] || '',
      last_name: customerDetails.name?.split(' ').slice(1).join(' ') || '',
      email: customerDetails.email || '',
      phone: customerDetails.phone || '',
      address_line1: customerDetails.address.line1 || '',
      address_line2: customerDetails.address.line2 || '',
      city: customerDetails.address.city || '',
      postal_code: customerDetails.address.postal_code || '',
      state: customerDetails.address.state || '',
      country: customerDetails.address.country || 'FR',
    } : null;

    // Parse user agent for device/browser info
    const deviceInfo = parseUserAgent(userAgent);

    // Build metadata with all captured information
    const enrichedMetadata = {
      // Client device info
      device_type: deviceInfo.deviceType,
      browser: deviceInfo.browser,
      browser_version: deviceInfo.browserVersion,
      os: deviceInfo.os,
      user_agent: userAgent,
      
      // Network info
      client_ip: clientIP,
      accept_language: acceptLanguage,
      order_country: shippingDetails?.address?.country || customerDetails?.address?.country || 'Unknown',
      
      // Stripe session info
      stripe_session_id: session_id,
      stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id,
      payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
      
      // Coupon/discount info from session metadata
      discount_code: session.metadata?.discount_code || null,
      discount_amount: session.metadata?.discount_amount ? parseFloat(session.metadata.discount_amount) : 0,
      
      // Guest tracking
      guest_id: orderData.user_id ? null : generateGuestId(session_id, customerDetails?.email),
      
      // Timing
      checkout_completed_at: new Date().toISOString(),
    };

    logStep("Enriched metadata prepared", { 
      deviceType: deviceInfo.deviceType,
      browser: deviceInfo.browser,
      country: enrichedMetadata.order_country,
      hasDiscount: !!enrichedMetadata.discount_code
    });

    // Update order with all captured data
    const { error: updateOrderError } = await supabaseService
      .from('orders')
      .update({ 
        status: 'paid',
        order_status: 'paid',
        payment_reference: typeof session.payment_intent === 'string' 
          ? session.payment_intent 
          : session.payment_intent?.id,
        payment_method: session.payment_method_types?.[0] || 'card',
        shipping_address: shippingAddress,
        billing_address: billingAddress,
        metadata: enrichedMetadata,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderData.id);

    if (updateOrderError) {
      logStep("Error updating order status", updateOrderError);
      throw new Error(`Failed to update order: ${updateOrderError.message}`);
    }

    logStep("Order status updated to paid with enriched data");

    // Run fraud detection scoring
    try {
      logStep("Running fraud detection...");
      
      // Check if this is first order from customer
      let isFirstOrder = true;
      if (orderData.user_id) {
        const { count } = await supabaseService
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', orderData.user_id)
          .neq('id', orderData.id)
          .eq('status', 'paid');
        isFirstOrder = (count || 0) === 0;
      }

      // Calculate fraud score using database function
      const { data: fraudResult, error: fraudError } = await supabaseService
        .rpc('calculate_fraud_score', {
          p_order_id: orderData.id,
          p_customer_email: session.customer_details?.email || '',
          p_shipping_address: shippingAddress,
          p_billing_address: billingAddress,
          p_ip_address: clientIP,
          p_user_agent: userAgent,
          p_checkout_duration_seconds: null,
          p_is_first_order: isFirstOrder,
          p_order_amount: (orderData.amount || 0) / 100
        });

      if (fraudError) {
        logStep("Warning: Fraud detection error (non-blocking)", { error: fraudError.message });
      } else {
        logStep("Fraud detection completed", fraudResult);
        
        // If order was put on hold, don't proceed with normal confirmation
        if (fraudResult?.auto_action === 'hold' || fraudResult?.auto_action === 'reject') {
          logStep("Order held for fraud review", { 
            score: fraudResult.total_score,
            riskLevel: fraudResult.risk_level 
          });
        }
      }
    } catch (fraudError) {
      logStep("Warning: Fraud detection failed (non-blocking)", { error: fraudError.message });
    }

    // Log status change in order_status_history with enriched data
    await supabaseService
      .from('order_status_history')
      .insert({
        order_id: orderData.id,
        previous_status: orderData.order_status || 'payment_pending',
        new_status: 'paid',
        changed_by: 'webhook',
        reason_code: 'PAYMENT_CONFIRMED',
        reason_message: 'Payment verified via Stripe',
        ip_address: clientIP,
        user_agent: userAgent,
        metadata: {
          stripe_session_id: session_id,
          payment_intent: typeof session.payment_intent === 'string' 
            ? session.payment_intent 
            : session.payment_intent?.id,
          device_type: deviceInfo.deviceType,
          browser: deviceInfo.browser,
          country: enrichedMetadata.order_country
        }
      });

    logStep("Status history logged");

    // Update stock quantities
    const stockUpdates = [];
    for (const item of orderData.order_items) {
      try {
        // Get current stock
        const { data: product, error: productError } = await supabaseService
          .from('products')
          .select('stock_quantity')
          .eq('id', item.product_id)
          .single();

        if (productError) {
          logStep("Error getting product stock", { 
            productId: item.product_id, 
            error: productError 
          });
          continue;
        }

        const currentStock = product.stock_quantity || 0;
        const newStock = Math.max(0, currentStock - item.quantity);

        // Update stock
        const { error: stockError } = await supabaseService
          .from('products')
          .update({ 
            stock_quantity: newStock,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.product_id);

        if (stockError) {
          logStep("Error updating stock", { 
            productId: item.product_id, 
            error: stockError 
          });
        } else {
          stockUpdates.push({
            productId: item.product_id,
            previousStock: currentStock,
            newStock: newStock,
            quantitySold: item.quantity
          });
          logStep("Stock updated", {
            productId: item.product_id,
            from: currentStock,
            to: newStock,
            sold: item.quantity
          });
        }
      } catch (error) {
        logStep("Error processing stock update", { 
          productId: item.product_id, 
          error: error.message 
        });
      }
    }

    // Create payment record
    const { error: paymentError } = await supabaseService
      .from('payments')
      .insert({
        order_id: orderData.id,
        stripe_payment_intent_id: typeof session.payment_intent === 'string' 
          ? session.payment_intent 
          : session.payment_intent?.id,
        amount: orderData.amount,
        currency: orderData.currency,
        status: 'completed',
        processed_at: new Date().toISOString(),
        metadata: {
          stripe_session_id: session_id,
          customer_email: session.customer_details?.email,
          payment_method: session.payment_method_types?.[0],
          client_ip: clientIP,
          discount_code: enrichedMetadata.discount_code
        }
      });

    if (paymentError) {
      logStep("Error creating payment record", paymentError);
      // Non-fatal error, continue
    }

    // Send order confirmation email with React Email template
    try {
      const customerEmail = session.customer_details?.email;
      const customerName = session.customer_details?.name || session.metadata?.customer_name || 'Client';
      
      if (customerEmail) {
        logStep("Sending enhanced order confirmation email", { email: customerEmail });
        
        // Get product details for email
        const productIds = orderData.order_items.map((item: any) => item.product_id);
        const { data: products } = await supabaseService
          .from('products')
          .select('id, name, images, price')
          .in('id', productIds);

        const productMap = new Map(products?.map((p: any) => [p.id, p]) || []);
        
        // Build items array for email
        const emailItems = orderData.order_items.map((item: any) => {
          const product = productMap.get(item.product_id);
          return {
            name: product?.name || `Product #${item.product_id}`,
            quantity: item.quantity,
            price: item.unit_price / 100, // Convert from cents
            image: product?.images?.[0] || undefined
          };
        });

        // Calculate totals
        const subtotal = emailItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
        const total = orderData.amount / 100;
        const shipping = total - subtotal > 0 ? total - subtotal : 0;
        
        // Build shipping address for email
        const emailShippingAddress = {
          address: shippingAddress?.address_line1 || session.metadata?.address || '',
          city: shippingAddress?.city || session.metadata?.city || '',
          postalCode: shippingAddress?.postal_code || session.metadata?.postalCode || '',
          country: shippingAddress?.country === 'FR' ? 'France' : 
                   shippingAddress?.country || session.metadata?.country || 'France'
        };

        // Call the enhanced email edge function
        const emailResponse = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-order-confirmation`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
            },
            body: JSON.stringify({
              orderId: orderData.id,
              customerEmail: customerEmail,
              customerName: customerName,
              items: emailItems,
              subtotal: subtotal,
              shipping: shipping,
              discount: enrichedMetadata.discount_amount || 0,
              total: total,
              currency: orderData.currency?.toUpperCase() || 'EUR',
              shippingAddress: emailShippingAddress
            })
          }
        );

        if (emailResponse.ok) {
          logStep("Enhanced order confirmation email sent successfully");
        } else {
          const emailError = await emailResponse.text();
          logStep("Warning: Failed to send confirmation email", { error: emailError });
        }
      } else {
        logStep("Warning: No customer email found, skipping notification");
      }
    } catch (emailError) {
      logStep("Warning: Error sending confirmation email", { error: emailError.message });
      // Non-fatal error, continue
    }

    logStep("Payment verification completed", {
      orderId: orderData.id,
      stockUpdatesCount: stockUpdates.length,
      hasShippingAddress: !!shippingAddress,
      hasBillingAddress: !!billingAddress
    });

    return new Response(JSON.stringify({ 
      success: true,
      message: "Payment verified and order processed",
      orderId: orderData.id,
      stockUpdates: stockUpdates.length
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in verify-payment", { message: errorMessage });
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

// Parse user agent to extract device, browser, and OS information
function parseUserAgent(ua: string): {
  deviceType: string;
  browser: string;
  browserVersion: string;
  os: string;
} {
  const result = {
    deviceType: 'Desktop',
    browser: 'Unknown',
    browserVersion: '',
    os: 'Unknown'
  };

  if (!ua) return result;

  // Detect device type
  if (/Mobile|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    if (/iPad|Tablet/i.test(ua)) {
      result.deviceType = 'Tablet';
    } else {
      result.deviceType = 'Mobile';
    }
  }

  // Detect browser
  if (ua.includes('Firefox/')) {
    result.browser = 'Firefox';
    const match = ua.match(/Firefox\/(\d+)/);
    if (match) result.browserVersion = match[1];
  } else if (ua.includes('Edg/')) {
    result.browser = 'Edge';
    const match = ua.match(/Edg\/(\d+)/);
    if (match) result.browserVersion = match[1];
  } else if (ua.includes('Chrome/')) {
    result.browser = 'Chrome';
    const match = ua.match(/Chrome\/(\d+)/);
    if (match) result.browserVersion = match[1];
  } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
    result.browser = 'Safari';
    const match = ua.match(/Version\/(\d+)/);
    if (match) result.browserVersion = match[1];
  } else if (ua.includes('MSIE') || ua.includes('Trident/')) {
    result.browser = 'Internet Explorer';
  }

  // Detect OS
  if (ua.includes('Windows')) {
    result.os = 'Windows';
    if (ua.includes('Windows NT 10')) result.os = 'Windows 10/11';
    else if (ua.includes('Windows NT 6.3')) result.os = 'Windows 8.1';
    else if (ua.includes('Windows NT 6.2')) result.os = 'Windows 8';
    else if (ua.includes('Windows NT 6.1')) result.os = 'Windows 7';
  } else if (ua.includes('Mac OS X')) {
    result.os = 'macOS';
  } else if (ua.includes('Linux')) {
    result.os = 'Linux';
  } else if (ua.includes('Android')) {
    result.os = 'Android';
  } else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) {
    result.os = 'iOS';
  }

  return result;
}
