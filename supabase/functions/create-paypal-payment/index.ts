import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-csrf-token, x-csrf-nonce, x-csrf-hash, x-guest-id, x-checkout-session-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PAYPAL-PAYMENT] ${step}${detailsStr}`);
};

const getPayPalBaseUrl = () => {
  const mode = Deno.env.get("PAYPAL_MODE") || "sandbox";
  return mode === "live" 
    ? "https://api-m.paypal.com" 
    : "https://api-m.sandbox.paypal.com";
};

const getAccessToken = async (): Promise<string> => {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  
  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials not configured");
  }

  const auth = btoa(`${clientId}:${clientSecret}`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = await response.text();
      logStep("Token error", { status: response.status, error });
      throw new Error(`Failed to get PayPal access token: ${error}`);
    }

    const data = await response.json();
    return data.access_token;
  } finally {
    clearTimeout(timeout);
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const supabaseService = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");
    
    const { items, customerInfo, discount } = await req.json();
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error("No items provided for payment");
    }

    if (items.length > 50) {
      throw new Error("Too many items (max 50)");
    }

    logStep("Received order data", { itemCount: items.length, hasDiscount: !!discount });

    // Get authenticated user (optional for guest checkout)
    let user = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabaseClient.auth.getUser(token);
      user = userData.user;
      logStep("User authenticated", { userId: user?.id });
    }

    // --- SERVER-SIDE PRICE VERIFICATION ---
    const productIds = items.map((item: any) => item.product.id);
    const { data: dbProducts, error: productError } = await supabaseService
      .from('products')
      .select('id, price, name, stock_quantity')
      .in('id', productIds);

    if (productError || !dbProducts) {
      throw new Error(`Failed to fetch product prices: ${productError?.message}`);
    }

    const productMap = new Map(dbProducts.map((p: any) => [p.id, p]));
    
    // Validate each item against DB prices
    const verifiedItems = items.map((item: any) => {
      const dbProduct = productMap.get(item.product.id);
      if (!dbProduct) {
        throw new Error(`Product not found: ${item.product.id}`);
      }
      if (item.quantity <= 0 || item.quantity > 99) {
        throw new Error(`Invalid quantity for ${dbProduct.name}`);
      }
      // Use DB price, not client price
      return {
        ...item,
        product: {
          ...item.product,
          price: dbProduct.price, // override with server price
          name: dbProduct.name,
        },
        _dbPrice: dbProduct.price,
      };
    });

    // Calculate totals with SERVER-VERIFIED prices
    const subtotal = verifiedItems.reduce((sum: number, item: any) => 
      sum + (item._dbPrice * item.quantity), 0);
    
    let discountAmount = 0;
    let hasFreeShipping = false;
    
    // Validate discount against DB
    if (discount && discount.code) {
      const { data: dbCoupon } = await supabaseService
        .from('discount_coupons')
        .select('*')
        .eq('code', discount.code.toUpperCase())
        .eq('is_active', true)
        .maybeSingle();

      if (dbCoupon) {
        const now = new Date();
        const validFrom = dbCoupon.valid_from ? new Date(dbCoupon.valid_from) : null;
        const validUntil = dbCoupon.valid_until ? new Date(dbCoupon.valid_until) : null;
        
        if ((!validFrom || now >= validFrom) && (!validUntil || now <= validUntil)) {
          if (!dbCoupon.usage_limit || dbCoupon.usage_count < dbCoupon.usage_limit) {
            if (!dbCoupon.minimum_order_amount || subtotal >= dbCoupon.minimum_order_amount) {
              if (dbCoupon.type === 'percentage') {
                discountAmount = subtotal * (dbCoupon.value / 100);
                if (dbCoupon.maximum_discount_amount) {
                  discountAmount = Math.min(discountAmount, dbCoupon.maximum_discount_amount);
                }
              } else {
                discountAmount = dbCoupon.value;
              }
              discountAmount = Math.min(discountAmount, subtotal);
              hasFreeShipping = dbCoupon.includes_free_shipping === true;
            }
          }
        }
      }
    }
    
    const shippingCost = hasFreeShipping ? 0 : (subtotal > 0 ? 6.95 : 0);
    
    const roundedSubtotal = Math.round(subtotal * 100) / 100;
    const roundedDiscount = Math.round(discountAmount * 100) / 100;
    const roundedShipping = Math.round(shippingCost * 100) / 100;
    const totalAmount = Math.round((roundedSubtotal - roundedDiscount + roundedShipping) * 100) / 100;

    logStep("Server-verified totals", { subtotal: roundedSubtotal, discountAmount: roundedDiscount, shippingCost: roundedShipping, totalAmount });

    // Create order in database
    const { data: orderData, error: orderError } = await supabaseService
      .from('orders')
      .insert({
        user_id: user?.id || null,
        amount: Math.round(totalAmount * 100),
        currency: 'eur',
        status: 'pending',
        payment_method: 'paypal'
      })
      .select('*')
      .single();

    if (orderError) {
      logStep("Error creating order", orderError);
      throw new Error(`Failed to create order: ${orderError.message}`);
    }

    logStep("Order created", { orderId: orderData.id });

    // Create order items with DB-verified prices
    const orderItems = verifiedItems.map((item: any) => ({
      order_id: orderData.id,
      product_id: item.product.id,
      quantity: item.quantity,
      unit_price: item._dbPrice,
      total_price: item._dbPrice * item.quantity,
      product_snapshot: {
        name: item.product.name,
        description: item.product.description,
        images: item.product.images,
        price: item._dbPrice
      }
    }));

    await supabaseService.from('order_items').insert(orderItems);

    // Get PayPal access token
    const accessToken = await getAccessToken();
    logStep("Got PayPal access token");

    // Build PayPal order items with server prices
    const paypalItems = verifiedItems.map((item: any) => ({
      name: item.product.name.substring(0, 127),
      unit_amount: {
        currency_code: "EUR",
        value: item._dbPrice.toFixed(2)
      },
      quantity: item.quantity.toString()
    }));

    const itemTotal = Math.round(verifiedItems.reduce((sum: number, item: any) => 
      sum + (item._dbPrice * item.quantity), 0) * 100) / 100;

    const origin = (req.headers.get("origin") || Deno.env.get("SITE_URL") || "https://www.rifelegance.com").replace(/\/+$/, '');
    
    const breakdown: any = {
      item_total: { currency_code: "EUR", value: itemTotal.toFixed(2) },
      shipping: { currency_code: "EUR", value: roundedShipping.toFixed(2) }
    };
    
    if (roundedDiscount > 0) {
      breakdown.discount = { currency_code: "EUR", value: roundedDiscount.toFixed(2) };
    }
    
    const paypalOrderPayload = {
      intent: "CAPTURE",
      purchase_units: [{
        reference_id: orderData.id,
        description: `Commande Rif Raw Straw #${orderData.id.substring(0, 8).toUpperCase()}`,
        amount: {
          currency_code: "EUR",
          value: totalAmount.toFixed(2),
          breakdown
        },
        items: paypalItems
      }],
      application_context: {
        brand_name: "Rif Raw Straw",
        landing_page: "BILLING",
        user_action: "PAY_NOW",
        return_url: `${origin}/payment-success?paypal=true&order_id=${orderData.id}`,
        cancel_url: `${origin}/checkout?cancelled=true`
      },
      payer: customerInfo?.email ? {
        email_address: customerInfo.email,
        name: {
          given_name: customerInfo.firstName || "",
          surname: customerInfo.lastName || ""
        }
      } : undefined
    };

    logStep("Creating PayPal order", { totalAmount });

    const paypalController = new AbortController();
    const paypalTimeout = setTimeout(() => paypalController.abort(), 20000);

    let paypalOrder: any;
    try {
      const paypalResponse = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation"
        },
        body: JSON.stringify(paypalOrderPayload),
        signal: paypalController.signal,
      });

      if (!paypalResponse.ok) {
        const errorText = await paypalResponse.text();
        logStep("PayPal order creation failed", { status: paypalResponse.status, error: errorText });
        throw new Error(`PayPal order creation failed: ${errorText}`);
      }

      paypalOrder = await paypalResponse.json();
    } finally {
      clearTimeout(paypalTimeout);
    }
    
    logStep("PayPal order created", { paypalOrderId: paypalOrder.id });

    // Update order with PayPal order ID
    await supabaseService
      .from('orders')
      .update({ 
        payment_reference: paypalOrder.id,
        metadata: {
          paypal_order_id: paypalOrder.id,
          customer_email: customerInfo?.email,
          customer_name: `${customerInfo?.firstName || ''} ${customerInfo?.lastName || ''}`.trim(),
          discount_code: discount?.code || null,
          discount_amount: roundedDiscount
        }
      })
      .eq('id', orderData.id);

    const approvalLink = paypalOrder.links?.find((link: any) => link.rel === "approve");
    
    if (!approvalLink) {
      throw new Error("No PayPal approval URL found");
    }

    logStep("Returning approval URL", { url: approvalLink.href });

    return new Response(JSON.stringify({ 
      url: approvalLink.href,
      orderId: orderData.id,
      paypalOrderId: paypalOrder.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("PayPal payment error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
