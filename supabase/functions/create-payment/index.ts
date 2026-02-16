import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-csrf-token, x-csrf-nonce, x-csrf-hash, x-guest-id, x-checkout-session-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PAYMENT] ${step}${detailsStr}`);
};

// Rate limiting
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const MAX_PAYMENT_ATTEMPTS = 3;
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

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

const verifyCsrfToken = async (token: string, nonce: string, hash: string): Promise<boolean> => {
  if (!token || !nonce || !hash) return false;
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

const sanitizeString = (input: string | undefined | null): string => {
  if (!input) return '';
  return input.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').trim().substring(0, 500);
};

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && email.length <= 254;
};

// Origin allowlist for Stripe redirect URLs
const ALLOWED_ORIGINS = [
  'https://rif-raw-straw.lovable.app',
  'https://id-preview--1ed5c182-2490-4180-9969-ca6a7e19e8ca.lovable.app',
];
const DEFAULT_ORIGIN = ALLOWED_ORIGINS[0]; // production

const getValidOrigin = (req: Request): string => {
  const origin = req.headers.get("origin") || '';
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  // Also allow any *.lovable.app or *.lovableproject.com origin
  if (/^https:\/\/[a-z0-9._-]+\.lovable(project\.com|\.app)$/.test(origin)) return origin;
  return DEFAULT_ORIGIN;
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

  const logPaymentEvent = async (event: {
    order_id?: string; event_type: string; status: string; actor: string;
    correlation_id?: string; error_message?: string; details?: Record<string, unknown>;
    ip_address?: string; duration_ms?: number;
  }) => {
    try {
      await supabaseService.from('payment_events').insert({
        order_id: event.order_id || null,
        correlation_id: event.correlation_id || null,
        event_type: event.event_type,
        status: event.status,
        actor: event.actor,
        details: event.details || {},
        error_message: event.error_message || null,
        ip_address: event.ip_address || null,
        duration_ms: event.duration_ms || null,
      });
    } catch (err) { console.error('[CREATE-PAYMENT] Failed to log event:', err); }
  };

  const startTime = Date.now();

  try {
    logStep("Function started");

    const rawIP = req.headers.get("x-forwarded-for")?.split(',')[0]?.trim() ||
                  req.headers.get("cf-connecting-ip") || "unknown";
    const clientIP = rawIP !== "unknown" ? rawIP.replace(/\.\d+$/, '.xxx') : "unknown";
    const clientCountry = req.headers.get("cf-ipcountry") || null;

    // Rate limit
    const rateLimitResult = checkRateLimit(clientIP);
    if (!rateLimitResult.allowed) {
      logStep("Rate limit exceeded", { clientIP });
      return new Response(
        JSON.stringify({ error: "Trop de tentatives de paiement. Veuillez réessayer dans 5 minutes." }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(RATE_LIMIT_WINDOW_MS / 1000))
          },
          status: 429,
        }
      );
    }

    // CSRF verification
    const csrfToken = req.headers.get("x-csrf-token");
    const csrfNonce = req.headers.get("x-csrf-nonce");
    const csrfHash = req.headers.get("x-csrf-hash");
    if (csrfToken && csrfNonce && csrfHash) {
      const csrfValid = await verifyCsrfToken(csrfToken, csrfNonce, csrfHash);
      if (!csrfValid) {
        logStep("CSRF verification failed");
        return new Response(
          JSON.stringify({ error: "Requête invalide. Veuillez rafraîchir la page et réessayer." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
        );
      }
      logStep("CSRF verification passed");
    } else {
      logStep("CSRF headers missing - allowing request with warning");
    }

    const { items, customerInfo, discount, guestSession } = await req.json();

    const guestMetadata = guestSession ? {
      guest_id: sanitizeString(guestSession.guest_id),
      device_type: sanitizeString(guestSession.device_type),
      os: sanitizeString(guestSession.os),
      browser: sanitizeString(guestSession.browser),
    } : null;

    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error("No items provided for payment");
    }
    if (items.length > 50) {
      throw new Error("Too many items in order");
    }
    if (customerInfo?.email && !isValidEmail(customerInfo.email)) {
      throw new Error("Invalid email format");
    }

    logStep("Received order data", { itemCount: items.length, hasDiscount: !!discount });

    // ========================================================================
    // 🔒 SERVER-SIDE PRICE VERIFICATION — NEVER trust client prices
    // ========================================================================
    const productIds = items.map((item: any) => item.product.id).filter(Boolean);
    if (productIds.length === 0) {
      throw new Error("Invalid product IDs");
    }

    const { data: dbProducts, error: productsError } = await supabaseService
      .from('products')
      .select('id, name, price, stock_quantity, is_active, is_available, images, description')
      .in('id', productIds);

    if (productsError || !dbProducts) {
      logStep("Error fetching products", productsError);
      throw new Error("Failed to verify product prices");
    }

    const productMap = new Map(dbProducts.map(p => [p.id, p]));

    const verifiedItems: Array<{
      product: { id: number; name: string; price: number; description: string; images: string[] };
      quantity: number;
    }> = [];

    for (const item of items) {
      const dbProduct = productMap.get(item.product.id);
      if (!dbProduct) {
        throw new Error(`Produit introuvable: ${item.product.id}`);
      }
      if (dbProduct.is_active === false || dbProduct.is_available === false) {
        throw new Error(`Produit indisponible: ${dbProduct.name}`);
      }
      if (dbProduct.stock_quantity !== null && dbProduct.stock_quantity < item.quantity) {
        throw new Error(`Stock insuffisant pour ${dbProduct.name}: ${dbProduct.stock_quantity} restant(s)`);
      }

      if (Math.abs((item.product.price || 0) - dbProduct.price) > 0.01) {
        logStep("Price discrepancy detected", {
          productId: dbProduct.id,
          clientPrice: item.product.price,
          dbPrice: dbProduct.price,
        });
      }

      verifiedItems.push({
        product: {
          id: dbProduct.id,
          name: dbProduct.name,
          price: dbProduct.price, // USE DB PRICE — never client price
          description: dbProduct.description || dbProduct.name,
          images: dbProduct.images || [],
        },
        quantity: item.quantity,
      });
    }

    logStep("Server-side price verification passed", { itemCount: verifiedItems.length });

    // ========================================================================
    // DISCOUNT VERIFICATION — server-side coupon validation
    // ========================================================================
    let discountAmountCents = 0;
    let hasFreeShipping = discount?.includesFreeShipping === true;
    let verifiedDiscountCode: string | null = null;

    if (discount?.code) {
      const { data: coupon, error: couponError } = await supabaseService
        .from('discount_coupons')
        .select('*')
        .eq('code', discount.code)
        .eq('is_active', true)
        .maybeSingle();

      if (couponError || !coupon) {
        logStep("Invalid discount code", { code: discount.code });
      } else {
        const now = new Date();
        const validFrom = coupon.valid_from ? new Date(coupon.valid_from) : null;
        const validUntil = coupon.valid_until ? new Date(coupon.valid_until) : null;

        if ((!validFrom || now >= validFrom) && (!validUntil || now <= validUntil)) {
          if (!coupon.usage_limit || (coupon.usage_count || 0) < coupon.usage_limit) {
            const subtotal = verifiedItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

            if (!coupon.minimum_order_amount || subtotal >= coupon.minimum_order_amount) {
              if (coupon.type === 'percentage') {
                discountAmountCents = Math.round(subtotal * 100 * (coupon.value / 100));
                if (coupon.maximum_discount_amount) {
                  discountAmountCents = Math.min(discountAmountCents, Math.round(coupon.maximum_discount_amount * 100));
                }
              } else {
                discountAmountCents = Math.round(coupon.value * 100);
              }
              verifiedDiscountCode = coupon.code;
              hasFreeShipping = hasFreeShipping || (coupon.includes_free_shipping === true);
              logStep("Server-verified discount", { code: coupon.code, discountCents: discountAmountCents });
            }
          }
        }
      }
    } else if (discount && discount.amount > 0) {
      logStep("WARNING: Discount amount provided without code — ignoring for security");
    }

    // ========================================================================
    // AMOUNT CALCULATION (all amounts in CENTS for Stripe)
    // ========================================================================
    const subtotalEuros = verifiedItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const subtotalCents = Math.round(subtotalEuros * 100);

    // Stripe requires minimum €0.50. Cap discount so total (including shipping) stays >= 50 cents.
    const STRIPE_MINIMUM_CENTS = 50;
    const shippingCentsEstimate = (subtotalEuros > 0 && !hasFreeShipping) ? 695 : 0;
    const maxAllowedDiscount = Math.max(0, subtotalCents + shippingCentsEstimate - STRIPE_MINIMUM_CENTS);
    if (discountAmountCents > maxAllowedDiscount) {
      logStep("Capping discount to meet Stripe minimum", { original: discountAmountCents, capped: maxAllowedDiscount });
      discountAmountCents = maxAllowedDiscount;
    }

    const discountRatio = discountAmountCents > 0 && subtotalCents > 0
      ? discountAmountCents / subtotalCents
      : 0;

    logStep("Amount calculation", { subtotalCents, discountAmountCents, discountRatio: (discountRatio * 100).toFixed(2) + '%' });

    // Create Stripe line items with verified prices
    const lineItems: any[] = [];
    verifiedItems.forEach((item) => {
      const originalPriceCents = Math.round(item.product.price * 100);
      const discountedPriceCents = discountRatio > 0
        ? Math.max(1, Math.round(originalPriceCents * (1 - discountRatio)))
        : originalPriceCents;

      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: {
            name: item.product.name,
            description: discountRatio > 0
              ? `Prix original: ${(originalPriceCents / 100).toFixed(2)}€`
              : (item.product.description || item.product.name),
            images: item.product.images?.length > 0 ? [
              `${getValidOrigin(req)}${item.product.images[0]}`
            ] : [],
          },
          unit_amount: discountedPriceCents,
        },
        quantity: item.quantity,
      });
    });

    // Shipping line item
    const SHIPPING_COST_CENTS = 695;
    if (subtotalEuros > 0 && !hasFreeShipping) {
      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: { name: "Frais de livraison", description: "Livraison standard" },
          unit_amount: SHIPPING_COST_CENTS,
        },
        quantity: 1,
      });
    }

    // ========================================================================
    // TOTAL in CENTS (stored in DB as cents for consistency)
    // ========================================================================
    const totalAmountCents = lineItems.reduce((sum: number, item: any) => sum + (item.price_data.unit_amount * item.quantity), 0);

    logStep("Total calculated", { totalAmountCents, lineItemCount: lineItems.length });

    // Stripe customer lookup
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    let customerId;
    if (customerInfo?.email) {
      const customers = await stripe.customers.list({ email: customerInfo.email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }
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

    // VIP threshold check
    const { data: businessRulesData } = await supabaseService
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'business_rules')
      .single();

    const businessRules = businessRulesData?.setting_value as any || {};
    const vipThreshold = (businessRules?.cart?.highValueThreshold || 1000) * 100;
    const isVipOrder = totalAmountCents >= vipThreshold;

    // Build shipping address
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

    // Generate correlation ID for end-to-end traceability
    const correlationId = crypto.randomUUID();

    const orderMetadata = {
      correlation_id: correlationId,
      guest_id: guestMetadata?.guest_id || null,
      device_type: guestMetadata?.device_type || null,
      os: guestMetadata?.os || null,
      browser: guestMetadata?.browser || null,
      client_ip: clientIP,
      client_country: clientCountry,
      discount_code: verifiedDiscountCode,
      discount_amount_cents: discountAmountCents,
      is_vip_order: isVipOrder,
      verified_subtotal_cents: subtotalCents,
    };

    // ========================================================================
    // CREATE ORDER — both `status` and `order_status` set to 'pending'
    // Amount stored in CENTS for consistency with Stripe
    // ========================================================================
    const { data: orderData, error: orderError } = await supabaseService
      .from('orders')
      .insert({
        user_id: user?.id || null,
        amount: totalAmountCents,
        currency: 'eur',
        status: 'pending',
        order_status: 'payment_pending',
        shipping_address: shippingAddress,
        billing_address: shippingAddress,
        metadata: orderMetadata,
      })
      .select('*')
      .single();

    if (orderError) {
      logStep("Error creating order", orderError);
      throw new Error(`Failed to create order: ${orderError.message}`);
    }

    logStep("Order created", { orderId: orderData.id, correlationId, isVipOrder, totalAmountCents });

    // Create order items with VERIFIED prices (stored in euros)
    const orderItems = verifiedItems.map((item) => ({
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

    // VIP notification (non-blocking)
    if (isVipOrder && customerInfo?.email) {
      try {
        await supabaseService.functions.invoke('send-vip-order-notification', {
          body: {
            order_id: orderData.id,
            customer_email: customerInfo.email,
            customer_name: `${customerInfo.firstName || ''} ${customerInfo.lastName || ''}`.trim() || 'Client',
            order_total: totalAmountCents / 100,
            threshold: vipThreshold / 100
          }
        });
        logStep("VIP notification sent");
      } catch (vipError) {
        logStep("VIP notification failed (non-fatal)", vipError);
      }
    }

    // ========================================================================
    // CREATE STRIPE CHECKOUT SESSION
    // ========================================================================
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
      payment_method_types: ['card'],
      success_url: `${getValidOrigin(req)}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getValidOrigin(req)}/checkout`,
      shipping_address_collection: shippingAddress ? undefined : {
        allowed_countries: ['FR', 'BE', 'CH', 'MC', 'LU'],
      },
      billing_address_collection: 'auto',
      phone_number_collection: { enabled: false },
      locale: 'fr',
      custom_text: {
        submit: {
          message: verifiedDiscountCode
            ? `Code promo ${verifiedDiscountCode} appliqué (-${(discountAmountCents / 100).toFixed(2)}€)${hasFreeShipping ? ' + Livraison offerte' : ''}`
            : undefined,
        },
        ...(shippingAddress ? {} : {
          shipping_address: { message: 'Veuillez entrer votre adresse de livraison' },
        }),
      },
      invoice_creation: {
        enabled: true,
        invoice_data: {
          description: `Commande Rif Raw Straw${verifiedDiscountCode ? ` - Code: ${verifiedDiscountCode}` : ''}`,
          metadata: { order_id: orderData.id, correlation_id: correlationId },
          custom_fields: verifiedDiscountCode ? [{ name: 'Code promo', value: verifiedDiscountCode }] : undefined,
          footer: 'Merci pour votre commande ! Rif Raw Straw - Artisanat berbère authentique',
        },
      },
      metadata: {
        order_id: orderData.id,
        correlation_id: correlationId,
        guest_id: guestMetadata?.guest_id || '',
        customer_name: customerInfo ? `${customerInfo.firstName} ${customerInfo.lastName}` : 'Guest',
        customer_phone: customerInfo?.phone || '',
        discount_code: verifiedDiscountCode || '',
        discount_amount_cents: String(discountAmountCents),
        free_shipping: hasFreeShipping ? 'true' : 'false',
      },
      payment_intent_data: {
        description: `Commande Rif Raw Straw #${orderData.id.substring(0, 8).toUpperCase()}`,
        metadata: {
          order_id: orderData.id,
          correlation_id: correlationId,
          discount_code: verifiedDiscountCode || '',
        },
        shipping: shippingAddress ? {
          name: `${shippingAddress.first_name} ${shippingAddress.last_name}`,
          phone: shippingAddress.phone || '',
          address: prefillShippingAddress,
        } : undefined,
      },
      consent_collection: { terms_of_service: 'required' },
    };

    logStep("Creating Stripe session", {
      hasShippingPrefill: !!shippingAddress,
      hasDiscount: !!verifiedDiscountCode,
      correlationId,
    });

    const session = await stripe.checkout.sessions.create(sessionParams);
    logStep("Stripe session created", { sessionId: session.id });

    // Update order with Stripe session ID and link to checkout session
    const checkoutSessionId = req.headers.get("x-checkout-session-id") || null;
    await supabaseService
      .from('orders')
      .update({
        stripe_session_id: session.id,
        ...(checkoutSessionId ? { checkout_session_id: checkoutSessionId } : {}),
      })
      .eq('id', orderData.id);

    // Log payment event
    await logPaymentEvent({
      order_id: orderData.id,
      event_type: 'stripe_session_created',
      status: 'success',
      actor: 'edge_function',
      correlation_id: correlationId,
      ip_address: clientIP,
      duration_ms: Date.now() - startTime,
      details: {
        stripe_session_id: session.id,
        item_count: verifiedItems.length,
        subtotal_cents: subtotalCents,
        total_cents: totalAmountCents,
        discount_cents: discountAmountCents,
        discount_code: verifiedDiscountCode || null,
        is_vip: isVipOrder,
        has_user: !!user?.id,
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Payment creation error:", error);

    await logPaymentEvent({
      event_type: 'payment_initiation_failed',
      status: 'error',
      actor: 'edge_function',
      error_message: error.message,
      duration_ms: Date.now() - startTime,
      details: { error_type: error.constructor?.name || 'Unknown' },
    });

    const isValidationError = error.message.includes('introuvable') ||
      error.message.includes('indisponible') ||
      error.message.includes('insuffisant') ||
      error.message.includes('Invalid') ||
      error.message.includes('No items');

    return new Response(JSON.stringify({
      error: error.message,
      error_type: isValidationError ? 'validation' : 'internal',
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: isValidationError ? 422 : 500,
    });
  }
});
