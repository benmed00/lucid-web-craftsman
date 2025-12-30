import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PAYMENT] ${step}${detailsStr}`);
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
    
    const { session_id } = await req.json();
    
    if (!session_id) {
      throw new Error("No session ID provided");
    }

    logStep("Verifying session", { sessionId: session_id });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Retrieve session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    if (!session) {
      throw new Error("Session not found");
    }

    logStep("Session retrieved", { 
      paymentStatus: session.payment_status, 
      orderId: session.metadata?.order_id 
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

    // Update order status to paid
    const { error: updateOrderError } = await supabaseService
      .from('orders')
      .update({ 
        status: 'paid',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderData.id);

    if (updateOrderError) {
      logStep("Error updating order status", updateOrderError);
      throw new Error(`Failed to update order: ${updateOrderError.message}`);
    }

    logStep("Order status updated to paid");

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
        stripe_payment_intent_id: session.payment_intent,
        amount: orderData.amount,
        currency: orderData.currency,
        status: 'completed',
        processed_at: new Date().toISOString(),
        metadata: {
          stripe_session_id: session_id,
          customer_email: session.customer_details?.email
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
      const shippingDetails = session.shipping_details || session.customer_details;
      
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
        
        // Build shipping address
        const shippingAddress = {
          address: shippingDetails?.address?.line1 || session.metadata?.address || '',
          city: shippingDetails?.address?.city || session.metadata?.city || '',
          postalCode: shippingDetails?.address?.postal_code || session.metadata?.postalCode || '',
          country: shippingDetails?.address?.country === 'FR' ? 'France' : 
                   shippingDetails?.address?.country || session.metadata?.country || 'France'
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
              discount: 0,
              total: total,
              currency: orderData.currency?.toUpperCase() || 'EUR',
              shippingAddress: shippingAddress
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
      stockUpdatesCount: stockUpdates.length
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