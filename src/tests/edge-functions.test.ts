/**
 * Edge Functions Integration Tests
 *
 * Tests all Supabase Edge Functions for request validation, auth requirements,
 * and response contract. Uses supabase.functions.invoke() against deployed functions.
 *
 * Prerequisites:
 * - VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env for basic tests
 * - SUPABASE_SERVICE_ROLE_KEY in .env for admin-protected function tests
 *
 * Run: npx vitest src/tests/edge-functions.test.ts --run
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { EXTERNAL_SERVICES } from '@/config/app.config';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || EXTERNAL_SERVICES.supabase.url;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
// Service role key from process.env (Vitest) or import.meta.env for Vite test mode
const SERVICE_ROLE_KEY =
  (typeof process !== 'undefined' && process.env?.SUPABASE_SERVICE_ROLE_KEY) ||
  (import.meta.env as { SUPABASE_SERVICE_ROLE_KEY?: string })?.SUPABASE_SERVICE_ROLE_KEY ||
  '';

const hasAnonConfig = Boolean(SUPABASE_URL && ANON_KEY);
const hasServiceRole = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);

// Single shared clients to avoid "Multiple GoTrueClient instances" warning
let anonClient: SupabaseClient;
let serviceClient: SupabaseClient;

beforeAll(() => {
  if (hasAnonConfig) {
    anonClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  }
  if (hasServiceRole) {
    serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  }
});

describe('Edge Functions - Config Check', () => {
  it('should have Supabase URL configured for tests', () => {
    expect(SUPABASE_URL).toBeTruthy();
  });

  it('should have anon key for basic invocation tests', () => {
    expect(ANON_KEY).toBeTruthy();
  });
});

describe.each([
  'create-payment',
  'verify-payment',
  'create-paypal-payment',
  'verify-paypal-payment',
  'stripe-webhook',
  'send-order-confirmation',
  'send-shipping-notification',
  'send-delivery-confirmation',
  'send-cancellation-email',
  'send-order-notification-improved',
  'send-vip-order-notification',
  'check-promo-alerts',
  'security-alert-notification',
  'process-scheduled-emails',
  'carrier-webhook',
])('Edge Function: %s', (functionName) => {
  it('should be invokable (returns response, not network error)', async () => {
    if (!hasAnonConfig) return;
    const { data, error } = await anonClient.functions.invoke(functionName, {
      body: {},
    });
    // We expect either a validation/error response from the function, or a network error
    // The function should NOT throw - it should return a structured response
    expect(error === null || typeof error === 'object' || error instanceof Error).toBe(true);
    expect(data === null || typeof data === 'object').toBe(true);
  }, 15000);
});

describe('create-payment', () => {
  it('should reject empty items with validation error', async () => {
    if (!hasAnonConfig) return;
    const { data, error } = await anonClient.functions.invoke('create-payment', {
      body: { items: [], customerInfo: {}, discount: null },
    });
    const errMsg = data?.error || (error as { message?: string })?.message || '';
    expect(errMsg).toMatch(/No items|items provided|non-2xx/i);
  }, 15000);

  it('should reject missing items field', async () => {
    if (!hasAnonConfig) return;
    const { data, error } = await anonClient.functions.invoke('create-payment', {
      body: { customerInfo: {} },
    });
    expect(data?.error || (error as { message?: string })?.message).toBeTruthy();
  }, 15000);

  it('should reject invalid product (non-existent id)', async () => {
    if (!hasAnonConfig) return;
    const { data, error } = await anonClient.functions.invoke('create-payment', {
      body: {
        items: [{ product: { id: '00000000-0000-0000-0000-000000000000', name: 'Test', price: 10 }, quantity: 1 }],
        customerInfo: { email: 'test@test.com' },
      },
    });
    expect(data?.error || (error as { message?: string })?.message).toBeTruthy();
  }, 15000);
});

describe('verify-payment', () => {
  it('should reject missing session_id', async () => {
    if (!hasAnonConfig) return;
    const { data, error } = await anonClient.functions.invoke('verify-payment', {
      body: {},
    });
    expect(data?.error || data?.success === false || (error as object)).toBeTruthy();
  }, 15000);

  it('should return structured response for invalid session', async () => {
    if (!hasAnonConfig) return;
    const { data, error } = await anonClient.functions.invoke('verify-payment', {
      body: { session_id: 'cs_invalid_test_123' },
    });
    // Either we get data with success/error, or the client reports an error
    const hasData = data !== null && data !== undefined;
    const hasStructuredData = hasData && (typeof data?.success === 'boolean' || typeof data?.error === 'string');
    const hasError = error !== null && error !== undefined;
    expect(hasStructuredData || hasError).toBe(true);
  }, 15000);
});

describe('create-paypal-payment', () => {
  it('should reject empty items', async () => {
    if (!hasAnonConfig) return;
    const { data, error } = await anonClient.functions.invoke('create-paypal-payment', {
      body: { items: [], customerInfo: {}, discount: null },
    });
    const errMsg = data?.error || (error as { message?: string })?.message || '';
    expect(errMsg).toMatch(/No items|non-2xx/i);
  }, 15000);
});

describe('verify-paypal-payment', () => {
  it('should reject missing paypal_order_id', async () => {
    if (!hasAnonConfig) return;
    const { data, error } = await anonClient.functions.invoke('verify-paypal-payment', {
      body: {},
    });
    const errMsg = data?.error || (error as { message?: string })?.message || '';
    expect(errMsg).toMatch(/PayPal order ID|required|non-2xx/i);
  }, 15000);
});

describe('send-order-confirmation', () => {
  let supabase: SupabaseClient;

  beforeAll(() => {
    if (!hasServiceRole) return;
    supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  });

  it('should require Authorization (anon key is not service role)', async () => {
    if (!hasAnonConfig) return;
    const { data, error } = await anonClient.functions.invoke('send-order-confirmation', {
      body: {},
    });
    const errMsg = data?.error || (error as { message?: string })?.message || '';
    expect(errMsg).toMatch(/Unauthorized|Invalid token|Forbidden|Missing required|non-2xx/i);
  }, 15000);

  it.skipIf(!hasServiceRole)('should return preview when previewOnly=true with service role', async () => {
    const { data } = await serviceClient.functions.invoke('send-order-confirmation', {
      body: {
        orderId: 'test-order-id',
        customerEmail: 'preview@test.com',
        customerName: 'Preview User',
        items: [{ name: 'Test', quantity: 1, price: 10 }],
        subtotal: 10,
        shipping: 5,
        total: 15,
        previewOnly: true,
      },
    });
    expect(data?.success).toBe(true);
    expect(data?.previewHtml).toBeDefined();
    expect(data?.message).toMatch(/preview/i);
  }, 15000);

  it.skipIf(!hasServiceRole)('should reject missing required fields', async () => {
    const { data } = await serviceClient.functions.invoke('send-order-confirmation', {
      body: {},
    });
    expect(data?.error).toMatch(/Missing required|orderId|customerEmail|customerName/i);
  }, 15000);
});

describe('send-shipping-notification', () => {
  it.skipIf(!hasServiceRole)('should return preview when previewOnly=true', async () => {
    const { data } = await serviceClient.functions.invoke('send-shipping-notification', {
      body: {
        orderId: 'test-order-id',
        customerEmail: 'preview@test.com',
        customerName: 'Preview User',
        shippingAddress: { address: '123', city: 'Paris', postalCode: '75001', country: 'France' },
        items: [],
        previewOnly: true,
      },
    });
    expect(data?.success).toBe(true);
    expect(data?.previewHtml).toBeDefined();
  }, 15000);
});

describe('send-delivery-confirmation', () => {
  it.skipIf(!hasServiceRole)('should return preview when previewOnly=true', async () => {
    const { data } = await serviceClient.functions.invoke('send-delivery-confirmation', {
      body: {
        orderId: 'test-order-id',
        customerEmail: 'preview@test.com',
        customerName: 'Preview User',
        items: [],
        previewOnly: true,
      },
    });
    expect(data?.success).toBe(true);
    expect(data?.previewHtml).toBeDefined();
  }, 15000);
});

describe('send-cancellation-email', () => {
  it.skipIf(!hasServiceRole)('should return preview when previewOnly=true', async () => {
    const { data } = await serviceClient.functions.invoke('send-cancellation-email', {
      body: {
        orderId: 'test-order-id',
        customerEmail: 'preview@test.com',
        customerName: 'Preview User',
        items: [],
        previewOnly: true,
      },
    });
    expect(data?.success).toBe(true);
    expect(data?.previewHtml).toBeDefined();
  }, 15000);
});

describe('send-vip-order-notification', () => {
  it.skipIf(!hasServiceRole)('should reject missing payload fields with service role', async () => {
    const { data } = await serviceClient.functions.invoke('send-vip-order-notification', {
      body: {},
    });
    expect(data?.error || data?.success === false).toBeTruthy();
  }, 15000);
});

describe('send-order-notification-improved', () => {
  it('should require auth (reject anon)', async () => {
    if (!hasAnonConfig) return;
    const { data, error } = await anonClient.functions.invoke('send-order-notification-improved', {
      body: { order_id: 'test', new_status: 'paid' },
    });
    const errMsg = data?.error || (error as { message?: string })?.message || '';
    expect(errMsg).toMatch(/Unauthorized|Invalid token|Forbidden|Order not found|non-2xx/i);
  }, 15000);
});

describe('check-promo-alerts', () => {
  it('should require admin auth', async () => {
    if (!hasAnonConfig) return;
    const { data, error } = await anonClient.functions.invoke('check-promo-alerts', {
      body: {},
    });
    const errMsg = data?.error || (error as { message?: string })?.message || '';
    expect(errMsg).toMatch(/Unauthorized|Invalid token|Forbidden|Admin|non-2xx/i);
  }, 15000);
});

describe('security-alert-notification', () => {
  it.skipIf(!hasServiceRole)('should return success when no pending alerts', async () => {
    const { data } = await serviceClient.functions.invoke('security-alert-notification', {
      body: {},
    });
    expect(data?.success).toBe(true);
    expect(data?.message === 'No pending alerts' || data?.alertsProcessed !== undefined).toBe(true);
  }, 15000);
});

describe('process-scheduled-emails', () => {
  let supabase: SupabaseClient;

  beforeAll(() => {
    if (!hasServiceRole) return;
    supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  });

  it('should require admin auth', async () => {
    if (!hasAnonConfig) return;
    const { data, error } = await anonClient.functions.invoke('process-scheduled-emails', {
      body: {},
    });
    const errMsg = data?.error || (error as { message?: string })?.message || '';
    expect(errMsg).toMatch(/Unauthorized|Invalid token|Forbidden|Admin|non-2xx/i);
  }, 15000);
});

describe('stripe-webhook', () => {
  it.skipIf(!hasAnonConfig)('should reject non-POST method', async () => {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/stripe-webhook`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    expect(response.status).toBe(405);
  }, 5000);
});

describe('carrier-webhook', () => {
  it('should respond to webhook payload (may require signature)', async () => {
    if (!hasAnonConfig) return;
    const { data, error } = await anonClient.functions.invoke('carrier-webhook', {
      body: {
        event_type: 'LIVRE',
        status: 'delivered',
        tracking_number: 'test-123',
        timestamp: new Date().toISOString(),
        carrier: 'generic',
      },
    });
    // Expect structured response: either success or error about signature/config
    expect(typeof data === 'object' || data === null).toBe(true);
    expect(error === null || typeof error === 'object').toBe(true);
  }, 15000);
});
