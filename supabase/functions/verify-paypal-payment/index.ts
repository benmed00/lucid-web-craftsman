import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-guest-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PAYPAL] ${step}${detailsStr}`);
};

const getPayPalBaseUrl = () => {
  const mode = Deno.env.get('PAYPAL_MODE') || 'sandbox';
  return mode === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
};

const getAccessToken = async (): Promise<string> => {
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
  const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured');
  }

  const auth = btoa(`${clientId}:${clientSecret}`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get PayPal access token: ${error}`);
    }

    const data = await response.json();
    return data.access_token;
  } finally {
    clearTimeout(timeout);
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseService = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    // --- AUTH CHECK: require either internal secret or authenticated user ---
    const authHeader = req.headers.get('Authorization');
    const internalSecret = Deno.env.get('INTERNAL_NOTIFY_SECRET');
    const isInternalCall =
      authHeader === `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`;

    if (!isInternalCall) {
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // Verify the user token is valid (any authenticated user who owns the order can verify)
      const authClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      );
      const token = authHeader.replace('Bearer ', '');
      const { data: claimsData, error: claimsError } =
        await authClient.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
        logStep('Auth failed', { error: claimsError?.message });
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // Store userId for ownership check below
      (req as any)._userId = claimsData.claims.sub;
    }

    const { paypal_order_id, order_id } = await req.json();

    logStep('Verifying PayPal payment', { paypal_order_id, order_id });

    if (!paypal_order_id) {
      throw new Error('PayPal order ID is required');
    }
    if (!order_id) {
      throw new Error('Order ID is required');
    }

    // --- IDEMPOTENCY CHECK: if order is already paid, return success ---
    const { data: existingOrder } = await supabaseService
      .from('orders')
      .select('status, user_id')
      .eq('id', order_id)
      .single();

    if (!existingOrder) {
      throw new Error('Order not found');
    }

    // Ownership check for non-internal calls
    const userId = (req as any)._userId;
    if (userId && existingOrder.user_id && existingOrder.user_id !== userId) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (existingOrder.status === 'paid') {
      logStep('Order already paid (idempotent)', { order_id });
      return new Response(
        JSON.stringify({
          success: true,
          status: 'COMPLETED',
          order_id,
          message: 'Payment already completed',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Get PayPal access token
    const accessToken = await getAccessToken();

    // Get PayPal order details
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    let paypalOrder: any;
    try {
      const orderResponse = await fetch(
        `${getPayPalBaseUrl()}/v2/checkout/orders/${paypal_order_id}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        }
      );

      if (!orderResponse.ok) {
        const errorText = await orderResponse.text();
        logStep('Failed to get PayPal order', { error: errorText });
        throw new Error(`Failed to get PayPal order: ${errorText}`);
      }

      paypalOrder = await orderResponse.json();
    } finally {
      clearTimeout(timeout);
    }

    logStep('PayPal order status', { status: paypalOrder.status });

    // --- SERVER-SIDE AMOUNT VERIFICATION ---
    const paypalAmount = parseFloat(
      paypalOrder.purchase_units?.[0]?.amount?.value || '0'
    );
    const dbAmountEur =
      existingOrder.status === 'pending'
        ? (
            await supabaseService
              .from('orders')
              .select('amount')
              .eq('id', order_id)
              .single()
          ).data?.amount
        : null;

    if (dbAmountEur !== null) {
      const expectedEur = dbAmountEur / 100; // DB stores cents
      if (Math.abs(paypalAmount - expectedEur) > 0.02) {
        logStep('AMOUNT MISMATCH', {
          paypal: paypalAmount,
          expected: expectedEur,
        });
        throw new Error(
          `Payment amount mismatch: PayPal=${paypalAmount}, expected=${expectedEur}`
        );
      }
    }

    if (paypalOrder.status === 'APPROVED') {
      logStep('Capturing PayPal payment');

      const captureController = new AbortController();
      const captureTimeout = setTimeout(() => captureController.abort(), 20000);

      let captureData: any;
      try {
        const captureResponse = await fetch(
          `${getPayPalBaseUrl()}/v2/checkout/orders/${paypal_order_id}/capture`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            signal: captureController.signal,
          }
        );

        if (!captureResponse.ok) {
          const errorText = await captureResponse.text();
          logStep('Capture failed', { error: errorText });
          throw new Error(`PayPal capture failed: ${errorText}`);
        }

        captureData = await captureResponse.json();
      } finally {
        clearTimeout(captureTimeout);
      }

      logStep('Payment captured', { status: captureData.status });

      if (captureData.status === 'COMPLETED') {
        const capture =
          captureData.purchase_units?.[0]?.payments?.captures?.[0];
        const payer = captureData.payer;

        // Optimistic lock: only update if still pending
        const { data: updated, error: updateError } = await supabaseService
          .from('orders')
          .update({
            status: 'paid',
            order_status: 'paid',
            payment_reference: paypal_order_id,
            metadata: {
              paypal_order_id,
              paypal_capture_id: capture?.id,
              paypal_status: captureData.status,
              payer_email: payer?.email_address,
              payer_name:
                `${payer?.name?.given_name || ''} ${payer?.name?.surname || ''}`.trim(),
              payer_id: payer?.payer_id,
              captured_at: new Date().toISOString(),
            },
          })
          .eq('id', order_id)
          .eq('status', 'pending') // optimistic lock
          .select('id')
          .maybeSingle();

        if (!updated) {
          logStep('Order already processed (optimistic lock)', { order_id });
          return new Response(
            JSON.stringify({
              success: true,
              status: 'COMPLETED',
              order_id,
              message: 'Payment already processed',
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            }
          );
        }

        if (updateError) {
          logStep('Error updating order', updateError);
          throw new Error(`Failed to update order: ${updateError.message}`);
        }

        // Create status history entry
        await supabaseService.from('order_status_history').insert({
          order_id: order_id,
          previous_status: 'CREATED',
          new_status: 'PAID',
          changed_by: 'system',
          metadata: {
            payment_method: 'paypal',
            paypal_order_id,
            capture_id: capture?.id,
          },
        });

        logStep('Order updated to paid', { orderId: order_id });

        // Send order confirmation email (non-fatal)
        try {
          await supabaseService.functions.invoke('send-order-confirmation', {
            body: { order_id },
          });
          logStep('Confirmation email sent');
        } catch (emailError) {
          logStep('Email send failed (non-fatal)', emailError);
        }

        return new Response(
          JSON.stringify({
            success: true,
            status: 'COMPLETED',
            order_id,
            transaction_id: capture?.id,
            message: 'Payment verified and order processed',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }
    } else if (paypalOrder.status === 'COMPLETED') {
      return new Response(
        JSON.stringify({
          success: true,
          status: 'COMPLETED',
          order_id,
          message: 'Payment already completed',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Payment not completed
    return new Response(
      JSON.stringify({
        success: false,
        status: paypalOrder.status,
        message: `Payment status: ${paypalOrder.status}`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('PayPal verification error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
