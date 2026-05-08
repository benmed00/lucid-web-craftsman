/**
 * Prerequisites: Deno 2, `--config supabase/functions/deno.json`.
 * Run: `pnpm run test:pricing-snapshot` (includes this file).
 *
 * Uses lightweight mocks — asserts persist wiring inside confirmOrderFromStripe.
 */
import { assertEquals } from 'https://deno.land/std@0.190.0/testing/asserts.ts';
import type Stripe from 'https://esm.sh/stripe@18.5.0';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

import {
  confirmOrderFromStripe,
  sendConfirmationEmail,
} from './confirm-order.ts';

function mockStripe(opts?: {
  lineItemsThrow?: boolean;
  amountTotal?: number;
}): Stripe {
  const total = opts?.amountTotal ?? 4999;
  return {
    checkout: {
      sessions: {
        listLineItems: async (
          _sessionId: string,
          _params?: { limit?: number }
        ) => {
          if (opts?.lineItemsThrow) {
            throw new Error('stripe unavailable');
          }
          return {
            data: [
              {
                description: 'Widget',
                quantity: 1,
                amount_total: total,
              },
            ],
          };
        },
      },
    },
  } as unknown as Stripe;
}

function checkoutSessionFixture(amountTotal: number): Stripe.Checkout.Session {
  return {
    id: 'cs_test_1',
    currency: 'eur',
    amount_subtotal: amountTotal,
    amount_total: amountTotal,
    total_details: {
      amount_discount: 0,
      amount_shipping: 0,
      amount_tax: 0,
    },
  } as Stripe.Checkout.Session;
}

type InsertRow = Record<string, unknown>;

function createOrdersMock(
  order: Record<string, unknown>,
  optimisticRow: { id: unknown } | null
) {
  let updateCall = 0;
  return {
    select() {
      return {
        eq() {
          return {
            single: async () =>
              Promise.resolve({ data: order, error: null as null }),
          };
        },
      };
    },
    update(_payload: unknown) {
      updateCall++;
      if (updateCall === 1) {
        return {
          eq(_col: string, _val: unknown) {
            return {
              eq(_col2: string, _val2: unknown) {
                return {
                  select(_s?: string) {
                    return {
                      maybeSingle: async () =>
                        Promise.resolve({
                          data: optimisticRow,
                          error: null,
                        }),
                    };
                  },
                };
              },
            };
          },
        };
      }
      return {
        eq(_col: string, _val: unknown) {
          return Promise.resolve({ error: null });
        },
      };
    },
  };
}

function createSupabase(opts: {
  order: Record<string, unknown>;
  loseLock?: boolean;
}) {
  const inserts: Array<{ table: string; row: InsertRow }> = [];

  const optimisticRow = opts.loseLock ? null : { id: opts.order.id };
  const ordersMock = createOrdersMock(opts.order, optimisticRow);

  const client = {
    from(table: string) {
      if (table === 'orders') return ordersMock;
      return {
        insert: (row: InsertRow) => {
          inserts.push({ table, row });
          return Promise.resolve({ error: null });
        },
      };
    },
  };

  return {
    client: client as unknown as SupabaseClient,
    inserts,
  };
}

const basePendingOrder = {
  id: 'ord-pending',
  status: 'pending',
  order_status: 'pending',
  amount: 2500,
  total_amount: null as number | null,
  currency: 'eur',
  user_id: null as string | null,
  metadata: {} as Record<string, unknown>,
  shipping_address: {} as Record<string, unknown>,
  billing_address: {} as Record<string, unknown>,
  order_items: [] as unknown[],
};

Deno.test(
  'confirmOrderFromStripe persists snapshot and sets payments.amount to snapshot total_minor',
  async () => {
    const { client, inserts } = createSupabase({
      order: { ...basePendingOrder },
    });
    const stripe = mockStripe({ amountTotal: 4999 });
    const session = checkoutSessionFixture(4999);

    const r = await confirmOrderFromStripe(client, {
      orderId: 'ord-pending',
      stripeSessionId: 'cs_test_1',
      paymentIntentId: 'pi_x',
      source: 'stripe_webhook',
      stripe,
      session,
    });

    assertEquals(r.confirmed, true);
    assertEquals(r.alreadyProcessed, false);

    const pay = inserts.find((i) => i.table === 'payments')?.row as
      | { amount?: number }
      | undefined;
    assertEquals(pay?.amount, 4999);
  }
);

Deno.test(
  'confirmOrderFromStripe returns alreadyProcessed when order already paid',
  async () => {
    const supabase = {
      from() {
        return {
          select() {
            return {
              eq() {
                return {
                  single() {
                    return Promise.resolve({
                      data: {
                        ...basePendingOrder,
                        status: 'paid',
                        order_status: 'paid',
                        amount: 100,
                        total_amount: 100,
                      },
                      error: null,
                    });
                  },
                };
              },
            };
          },
        };
      },
    } as unknown as SupabaseClient;

    const r = await confirmOrderFromStripe(supabase, {
      orderId: 'ord-paid',
      stripeSessionId: 'cs_x',
      source: 'verify_payment',
    });

    assertEquals(r.confirmed, true);
    assertEquals(r.alreadyProcessed, true);
  }
);

Deno.test(
  'confirmOrderFromStripe fails cleanly when order row missing',
  async () => {
    const supabase = {
      from() {
        return {
          select() {
            return {
              eq() {
                return {
                  single() {
                    return Promise.resolve({
                      data: null,
                      error: { message: 'not found' },
                    });
                  },
                };
              },
            };
          },
        };
      },
    } as unknown as SupabaseClient;

    const r = await confirmOrderFromStripe(supabase, {
      orderId: 'missing',
      stripeSessionId: 'cs_x',
      source: 'verify_payment',
    });

    assertEquals(r.confirmed, false);
    assertEquals(r.error, 'Order not found');
  }
);

Deno.test(
  'confirmOrderFromStripe stays confirmed when Stripe line items fail (persist logs warning)',
  async () => {
    const { client, inserts } = createSupabase({
      order: { ...basePendingOrder },
    });
    const stripe = mockStripe({ lineItemsThrow: true });
    const session = checkoutSessionFixture(4999);

    const r = await confirmOrderFromStripe(client, {
      orderId: 'ord-pending',
      stripeSessionId: 'cs_test_1',
      paymentIntentId: 'pi_y',
      source: 'verify_payment',
      stripe,
      session,
    });

    assertEquals(r.confirmed, true);
    assertEquals(r.alreadyProcessed, false);

    const persistFail = inserts.find(
      (i) =>
        i.table === 'payment_events' &&
        i.row.event_type === 'pricing_snapshot_persist_failed'
    );
    assertEquals(typeof persistFail?.row.order_id, 'string');

    const pay = inserts.find((i) => i.table === 'payments')?.row as
      | { amount?: number }
      | undefined;
    assertEquals(pay?.amount, 2500);
  }
);

Deno.test(
  'confirmOrderFromStripe loses optimistic lock → alreadyProcessed without inserts',
  async () => {
    const { client, inserts } = createSupabase({
      order: { ...basePendingOrder },
      loseLock: true,
    });
    const stripe = mockStripe({ amountTotal: 4999 });
    const session = checkoutSessionFixture(4999);

    const r = await confirmOrderFromStripe(client, {
      orderId: 'ord-pending',
      stripeSessionId: 'cs_test_1',
      source: 'stripe_webhook',
      stripe,
      session,
    });

    assertEquals(r.confirmed, true);
    assertEquals(r.alreadyProcessed, true);
    assertEquals(inserts.filter((i) => i.table === 'payments').length, 0);
  }
);

const baseSendEmailInput = {
  orderId: '00000000-0000-0000-0000-000000000099',
  customerEmail: 'buyer@example.com',
  customerName: 'Buyer Test',
  orderItems: [{ product_id: 42, quantity: 1, unit_price: 6200 }],
  orderAmount: 6200,
  currency: 'eur',
  shippingAddress: null as null,
  source: 'unit_test',
};

function createSupabaseForSendEmail(opts: { alreadySent?: boolean }) {
  return {
    from(table: string) {
      if (table === 'email_logs') {
        return {
          select(_cols?: string) {
            return {
              eq(_c: string, _v: unknown) {
                return {
                  eq(_c2: string, _v2: unknown) {
                    return {
                      eq(_c3: string, _v3: unknown) {
                        return {
                          maybeSingle: async () => ({
                            data: opts.alreadySent ? { id: 'log-1' } : null,
                            error: null,
                          }),
                        };
                      },
                    };
                  },
                };
              },
            };
          },
        };
      }
      if (table === 'products') {
        return {
          select(_cols?: string) {
            return {
              in(_col: string, _ids: number[]) {
                return Promise.resolve({
                  data: [
                    {
                      id: 42,
                      name: 'Test product',
                      images: [] as string[],
                      price: 62,
                    },
                  ],
                  error: null,
                });
              },
            };
          },
        };
      }
      return {};
    },
  } as unknown as SupabaseClient;
}

Deno.test(
  'sendConfirmationEmail skips fetch when order-confirmation already sent',
  async () => {
    const prevUrl = Deno.env.get('SUPABASE_URL');
    const prevKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    Deno.env.set('SUPABASE_URL', 'https://unit.supabase.co');
    Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'svc-unit-key');

    let fetchCalls = 0;
    const origFetch = globalThis.fetch;
    globalThis.fetch = (() => {
      fetchCalls++;
      return Promise.resolve(new Response('{}', { status: 200 }));
    }) as typeof fetch;

    try {
      await sendConfirmationEmail(
        createSupabaseForSendEmail({ alreadySent: true }),
        baseSendEmailInput
      );
      assertEquals(fetchCalls, 0);
    } finally {
      globalThis.fetch = origFetch;
      if (prevUrl === undefined) Deno.env.delete('SUPABASE_URL');
      else Deno.env.set('SUPABASE_URL', prevUrl);
      if (prevKey === undefined) Deno.env.delete('SUPABASE_SERVICE_ROLE_KEY');
      else Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', prevKey);
    }
  }
);

Deno.test(
  'sendConfirmationEmail POSTs to send-order-confirmation with service role on success',
  async () => {
    const prevUrl = Deno.env.get('SUPABASE_URL');
    const prevKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    Deno.env.set('SUPABASE_URL', 'https://unit.supabase.co');
    Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'svc-unit-key');

    let capturedUrl = '';
    let capturedInit: RequestInit | undefined;
    const origFetch = globalThis.fetch;
    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : (input as Request).url;
      capturedInit = init;
      return Promise.resolve(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    }) as typeof fetch;

    try {
      await sendConfirmationEmail(
        createSupabaseForSendEmail({ alreadySent: false }),
        baseSendEmailInput
      );
      assertEquals(
        capturedUrl,
        'https://unit.supabase.co/functions/v1/send-order-confirmation'
      );
      const headers = capturedInit?.headers as Record<string, string>;
      assertEquals(headers['Authorization'], 'Bearer svc-unit-key');
      assertEquals(headers['Content-Type'], 'application/json');
      const body = JSON.parse(capturedInit?.body as string) as {
        orderId: string;
        customerEmail: string;
      };
      assertEquals(body.orderId, baseSendEmailInput.orderId);
      assertEquals(body.customerEmail, baseSendEmailInput.customerEmail);
    } finally {
      globalThis.fetch = origFetch;
      if (prevUrl === undefined) Deno.env.delete('SUPABASE_URL');
      else Deno.env.set('SUPABASE_URL', prevUrl);
      if (prevKey === undefined) Deno.env.delete('SUPABASE_SERVICE_ROLE_KEY');
      else Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', prevKey);
    }
  }
);

Deno.test(
  'sendConfirmationEmail does not throw when send-order-confirmation returns non-OK',
  async () => {
    const prevUrl = Deno.env.get('SUPABASE_URL');
    const prevKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    Deno.env.set('SUPABASE_URL', 'https://unit.supabase.co');
    Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'svc-unit-key');

    let fetchCalls = 0;
    const origFetch = globalThis.fetch;
    globalThis.fetch = (() => {
      fetchCalls++;
      return Promise.resolve(
        new Response('upstream error', {
          status: 502,
          statusText: 'Bad Gateway',
        })
      );
    }) as typeof fetch;

    try {
      await sendConfirmationEmail(
        createSupabaseForSendEmail({ alreadySent: false }),
        baseSendEmailInput
      );
      assertEquals(fetchCalls, 1);
    } finally {
      globalThis.fetch = origFetch;
      if (prevUrl === undefined) Deno.env.delete('SUPABASE_URL');
      else Deno.env.set('SUPABASE_URL', prevUrl);
      if (prevKey === undefined) Deno.env.delete('SUPABASE_SERVICE_ROLE_KEY');
      else Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', prevKey);
    }
  }
);
