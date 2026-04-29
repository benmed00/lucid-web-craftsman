/**
 * Prerequisites: Deno 2, `--config supabase/functions/deno.json`.
 * Run: `npm run test:pricing-snapshot` (includes this file).
 *
 * Uses lightweight mocks — asserts persist wiring inside confirmOrderFromStripe.
 */
import { assertEquals } from 'https://deno.land/std@0.190.0/testing/asserts.ts';
import type Stripe from 'https://esm.sh/stripe@18.5.0';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

import { confirmOrderFromStripe } from './confirm-order.ts';

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
