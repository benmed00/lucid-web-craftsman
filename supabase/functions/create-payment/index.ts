import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-csrf-token, x-csrf-nonce, x-csrf-hash, x-guest-id",
};

// Helper logging function
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PAYMENT] ${step}${detailsStr}`);
};

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_PAYMENT_ATTEMPTS = 3;

// In-memory rate limiting (per instance - for production use Redis/DB)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Check rate limit for payment attempts
const checkRateLimit = (identifier: string): { allowed: boolean; remaining: number } => {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: MAX_PAYMENT_ATTEMPTS - 1 };
  }
  
  if (record.count >= MAX_PAYMENT_ATTEMPTS) {
    return { allowed: false, remaining: 0 };
  }
  
  record.count++;
  return { allowed: true, remaining: MAX_PAYMENT_ATTEMPTS - record.count };
};

// Verify CSRF token hash
const verifyCsrfToken = async (token: string, nonce: string, hash: string): Promise<boolean> => {
  if (!token || !nonce || !hash) {
    return false;
  }
  
  try {
    const data = new TextEncoder().encode(`${token}:${nonce}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const computedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return computedHash === hash;
  } catch {
    return false;
  }
};

// Sanitize string input
const sanitizeString = (input: string | undefined | null): string => {
  if (!input) return '';
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim()
    .substring(0, 500); // Limit length
};

// Validate email format
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && email.length <= 254;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Create Supabase clients
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
    
    // Extract client IP for rate limiting and fraud detection (truncated for GDPR)
    const rawIP = req.headers.get("x-forwarded-for")?.split(',')[0]?.trim() || 
                  req.headers.get("cf-connecting-ip") || 
                  "unknown";
    
    // Truncate IP for GDPR compliance (remove last octet for IPv4)
    const clientIP = rawIP !== "unknown" 
      ? rawIP.replace(/\.\d+$/, '.xxx') 
      : "unknown";
    
    // Extract client country from Cloudflare headers (if available)
    const clientCountry = req.headers.get("cf-ipcountry") || null;
    
    // Check rate limit
    const rateLimitResult = checkRateLimit(clientIP);
    if (!rateLimitResult.allowed) {
      logStep("Rate limit exceeded", { clientIP });
      return new Response(
        JSON.stringify({ error: "Trop de tentatives de paiement. Veuillez réessayer dans 5 minutes." }),
        {
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(RATE_LIMIT_WINDOW_MS / 1000))
          },
          status: 429,
        }
      );
    }
    
    // Verify CSRF token
    const csrfToken = req.headers.get("x-csrf-token");
    const csrfNonce = req.headers.get("x-csrf-nonce");
    const csrfHash = req.headers.get("x-csrf-hash");
    
    // CSRF verification (optional for now, log warnings)
    if (csrfToken && csrfNonce && csrfHash) {
      const csrfValid = await verifyCsrfToken(csrfToken, csrfNonce, csrfHash);
      if (!csrfValid) {
        logStep("CSRF verification failed", { hasToken: !!csrfToken });
        return new Response(
          JSON.stringify({ error: "Requête invalide. Veuillez rafraîchir la page et réessayer." }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 403,
          }
        );
      }
      logStep("CSRF verification passed");
    } else {
      logStep("CSRF headers missing - allowing request with warning");
    }
    
    const { items, customerInfo, discount, guestSession } = await req.json();
    
    // Extract guest session metadata (GDPR-compliant)
    const guestMetadata = guestSession ? {
      guest_id: sanitizeString(guestSession.guest_id),
      device_type: sanitizeString(guestSession.device_type),
      os: sanitizeString(guestSession.os),
      browser: sanitizeString(guestSession.browser),
    } : null;
    
    logStep("Guest session data", guestMetadata);
    
    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error("No items provided for payment");
    }
    
    if (items.length > 50) {
      throw new Error("Too many items in order");
    }
    
    // Validate and sanitize customer info
    if (customerInfo) {
      if (customerInfo.email && !isValidEmail(customerInfo.email)) {
        throw new Error("Invalid email format");
      }
    }

    logStep("Received order data", { itemCount: items.length, hasDiscount: !!discount, discountAmount: discount?.amount });

    // Store discount info for line item adjustment
    let discountAmountCents = 0;
    const hasFreeShipping = discount?.includesFreeShipping === true;
    
    if (discount && discount.amount > 0) {
      discountAmountCents = Math.round(discount.amount * 100); // Convert to cents
      logStep("Discount to be applied", { amountCents: discountAmountCents, code: discount.code, hasFreeShipping });
    }

    // Get authenticated user (optional for guest checkout)
    let user = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabaseClient.auth.getUser(token);
      user = userData.user;
      logStep("User authenticated", { userId: user?.id });
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Calculate subtotal
    const subtotal = items.reduce((sum: number, item: any) => sum + (item.product.price * item.quantity), 0);
    const subtotalCents = Math.round(subtotal * 100);
    
    // Calculate the discount ratio
    const discountRatio = discountAmountCents > 0 && subtotalCents > 0 
      ? discountAmountCents / subtotalCents 
      : 0;
    
    logStep("Discount calculation", { 
      subtotalCents, 
      discountAmountCents, 
      discountRatio: (discountRatio * 100).toFixed(2) + '%' 
    });

    // Create line items for Stripe with discount applied proportionally
    const lineItems: any[] = [];
    
    items.forEach((item: any) => {
      const originalPriceCents = Math.round(item.product.price * 100);
      // Apply discount proportionally to each item
      const discountedPriceCents = discountRatio > 0 
        ? Math.max(1, Math.round(originalPriceCents * (1 - discountRatio)))
        : originalPriceCents;
      
      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: {
            name: item.product.name,
            description: discountRatio > 0 
              ? `Prix original: ${(originalPriceCents/100).toFixed(2)}€` 
              : (item.product.description || item.product.name),
            images: item.product.images?.length > 0 ? [
              `${req.headers.get("origin")}${item.product.images[0]}`
            ] : [],
          },
          unit_amount: discountedPriceCents,
        },
        quantity: item.quantity,
      });
    });

    // Add shipping as a line item if applicable
    if (subtotal > 0 && !hasFreeShipping) {
      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: {
            name: "Frais de livraison",
            description: "Livraison standard",
          },
          unit_amount: 695, // €6.95 in cents
        },
        quantity: 1,
      });
    }
    
    logStep("Line items created", { 
      itemCount: lineItems.length, 
      discountApplied: discountRatio > 0 
    });

    // Check if customer exists or create metadata for new customer
    let customerId;
    if (customerInfo?.email) {
      const customers = await stripe.customers.list({ 
        email: customerInfo.email, 
        limit: 1 
      });
      
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }
    }

    // Calculate total amount
    const totalAmount = lineItems.reduce((sum, item) => sum + (item.price_data.unit_amount * item.quantity), 0);
    logStep("Calculated total amount", { totalAmount });

    // Fetch business rules for VIP threshold
    const { data: businessRulesData } = await supabaseService
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'business_rules')
      .single();

    const businessRules = businessRulesData?.setting_value as any || {};
    const vipThreshold = (businessRules?.cart?.highValueThreshold || 1000) * 100; // Convert to cents
    const isVipOrder = totalAmount >= vipThreshold;

    // Build shipping address from customer info
    const shippingAddress = customerInfo ? {
      first_name: sanitizeString(customerInfo.firstName),
      last_name: sanitizeString(customerInfo.lastName),
      email: customerInfo.email,
      phone: sanitizeString(customerInfo.phone) || null,
      address_line1: sanitizeString(customerInfo.address),
      address_line2: sanitizeString(customerInfo.addressComplement) || null,
      city: sanitizeString(customerInfo.city),
      postal_code: sanitizeString(customerInfo.postalCode),
      country: sanitizeString(customerInfo.country) || 'FR',
    } : null;

    logStep("Shipping address prepared", { hasAddress: !!shippingAddress });

    // Build order metadata with guest session and device info
    const orderMetadata = {
      // Guest session data (GDPR-compliant)
      guest_id: guestMetadata?.guest_id || null,
      device_type: guestMetadata?.device_type || null,
      os: guestMetadata?.os || null,
      browser: guestMetadata?.browser || null,
      // Network metadata (GDPR-compliant - truncated IP)
      client_ip: clientIP,
      client_country: clientCountry,
      // Discount info
      discount_code: discount?.code || null,
      discount_amount: discount?.amount || null,
      // VIP flag
      is_vip_order: isVipOrder,
    };

    // Create order record first
    const { data: orderData, error: orderError } = await supabaseService
      .from('orders')
      .insert({
        user_id: user?.id || null,
        amount: totalAmount,
        currency: 'eur',
        status: 'pending',
        shipping_address: shippingAddress,
        billing_address: shippingAddress, // Use same as shipping for now
        metadata: orderMetadata,
      })
      .select('*')
      .single();

    if (orderError) {
      logStep("Error creating order", orderError);
      throw new Error(`Failed to create order: ${orderError.message}`);
    }

    logStep("Order created", { orderId: orderData.id, isVipOrder });

    // Create order items
    const orderItems = items.map((item: any) => ({
      order_id: orderData.id,
      product_id: item.product.id,
      quantity: item.quantity,
      unit_price: item.product.price,
      total_price: item.product.price * item.quantity,
      product_snapshot: {
        name: item.product.name,
        description: item.product.description,
        images: item.product.images,
        price: item.product.price
      }
    }));

    const { error: itemsError } = await supabaseService
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      logStep("Error creating order items", itemsError);
      throw new Error(`Failed to create order items: ${itemsError.message}`);
    }

    logStep("Order items created", { itemCount: orderItems.length });

    // Send VIP notification if order exceeds threshold
    if (isVipOrder && customerInfo?.email) {
      logStep("Sending VIP order notification");
      try {
        await supabaseService.functions.invoke('send-vip-order-notification', {
          body: {
            order_id: orderData.id,
            customer_email: customerInfo.email,
            customer_name: `${customerInfo.firstName || ''} ${customerInfo.lastName || ''}`.trim() || 'Client',
            order_total: totalAmount / 100, // Convert back to euros
            threshold: vipThreshold / 100
          }
        });
        logStep("VIP notification sent successfully");
      } catch (vipError) {
        logStep("VIP notification failed (non-fatal)", vipError);
        // Non-fatal - don't block payment
      }
    }

    // Create checkout session with complete configuration
    // IMPORTANT: Pre-fill customer data to avoid double entry
    // Configure proper branding, shipping, and order summary
    
    // Build pre-filled shipping address for Stripe
    const prefillShippingAddress = shippingAddress ? {
      line1: shippingAddress.address_line1 || '',
      line2: shippingAddress.address_line2 || '',
      city: shippingAddress.city || '',
      postal_code: shippingAddress.postal_code || '',
      country: shippingAddress.country || 'FR',
    } : undefined;
    
    const sessionParams: any = {
      customer: customerId,
      customer_email: customerId ? undefined : customerInfo?.email,
      customer_creation: customerId ? undefined : 'always',
      line_items: lineItems,
      mode: "payment",
      // CRITICAL: Explicitly define payment methods for France (no iDEAL)
      payment_method_types: ['card'],
      success_url: `${req.headers.get("origin")}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/checkout`,
      // Pre-fill shipping address from checkout form to avoid double entry
      shipping_address_collection: shippingAddress ? undefined : {
        allowed_countries: ['FR', 'BE', 'CH', 'MC', 'LU'],
      },
      billing_address_collection: 'auto',
      // Pre-fill phone number
      phone_number_collection: {
        enabled: false, // Already collected in our forms
      },
      // Locale for French customers
      locale: 'fr',
    // Custom branding and business info
    custom_text: {
      submit: {
        message: discount?.code 
          ? `Code promo ${discount.code} appliqué (-${(discount.amount || 0).toFixed(2)}€)${hasFreeShipping ? ' + Livraison offerte' : ''}`
          : undefined,
      },
      // Only use shipping_address custom_text when Stripe collects the address
      ...(shippingAddress ? {} : {
        shipping_address: {
          message: 'Veuillez entrer votre adresse de livraison',
        },
      }),
    },
      // Invoice creation for record keeping
      invoice_creation: {
        enabled: true,
        invoice_data: {
          description: `Commande Rif Raw Straw${discount?.code ? ` - Code: ${discount.code}` : ''}`,
          metadata: {
            order_id: orderData.id,
            discount_code: discount?.code || '',
          },
          custom_fields: discount?.code ? [
            {
              name: 'Code promo',
              value: discount.code,
            },
          ] : undefined,
          footer: 'Merci pour votre commande ! Rif Raw Straw - Artisanat berbère authentique',
        },
      },
      // Order metadata for correlation
      metadata: {
        order_id: orderData.id,
        guest_id: guestMetadata?.guest_id || '',
        customer_name: customerInfo ? `${customerInfo.firstName} ${customerInfo.lastName}` : 'Guest',
        customer_phone: customerInfo?.phone || '',
        customer_address: shippingAddress ? `${shippingAddress.address_line1}, ${shippingAddress.postal_code} ${shippingAddress.city}` : '',
        device_type: guestMetadata?.device_type || '',
        client_country: clientCountry || '',
        discount_code: discount?.code || '',
        discount_amount: discount?.amount?.toString() || '0',
        free_shipping: hasFreeShipping ? 'true' : 'false',
      },
      // Payment intent data for direct metadata
      payment_intent_data: {
        description: `Commande Rif Raw Straw #${orderData.id.substring(0, 8).toUpperCase()}`,
        metadata: {
          order_id: orderData.id,
          discount_code: discount?.code || '',
        },
        // Pre-fill shipping for payment intent
        shipping: shippingAddress ? {
          name: `${shippingAddress.first_name} ${shippingAddress.last_name}`,
          phone: shippingAddress.phone || '',
          address: prefillShippingAddress,
        } : undefined,
      },
      // Consent collection for newsletter (optional)
      consent_collection: {
        terms_of_service: 'required',
      },
    };

    logStep("Creating Stripe session", { 
      paymentMethods: ['card'], 
      hasShippingPrefill: !!shippingAddress,
      hasDiscount: !!discount?.code,
      locale: 'fr'
    });

    const session = await stripe.checkout.sessions.create(sessionParams);

    logStep("Stripe session created", { sessionId: session.id });

    // Update order with Stripe session ID
    const { error: updateError } = await supabaseService
      .from('orders')
      .update({ stripe_session_id: session.id })
      .eq('id', orderData.id);

    if (updateError) {
      logStep("Error updating order with session ID", updateError);
      // Non-fatal error, continue
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Payment creation error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});