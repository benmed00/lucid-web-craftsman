/**
 * Mocked Stripe + Supabase for `persistPricingSnapshot` (verify/reconcile-style path).
 *
 * Prerequisites: Deno 2, `--config supabase/functions/deno.json`.
 * Run: `npm run test:pricing-snapshot:deno`
 */
import { assertEquals } from 'https://deno.land/std@0.190.0/testing/asserts.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

import { persistPricingSnapshot } from './persist-pricing-snapshot.ts';

Deno.test(
  'persistPricingSnapshot writes snapshot built from listLineItems',
  async () => {
    let captured: Record<string, unknown> | null = null;

    const supabase = {
      from(_table: string) {
        return {
          update(payload: Record<string, unknown>) {
            captured = payload;
            return {
              eq(_col: string, _id: string) {
                return Promise.resolve({ error: null });
              },
            };
          },
        };
      },
    };

    const stripe = {
      checkout: {
        sessions: {
          listLineItems: async (
            _sessionId: string,
            _opts: { limit: number }
          ) => ({
            data: [{ description: 'Widget', quantity: 2, amount_total: 2000 }],
          }),
        },
      },
    };

    const session = {
      id: 'cs_persist_test',
      currency: 'eur',
      amount_subtotal: 2000,
      amount_total: 2000,
      total_details: {},
    };

    const result = await persistPricingSnapshot(
      supabase as unknown as SupabaseClient,
      stripe as never,
      {
        orderId: 'order-uuid-1',
        session: session as never,
        source: 'verify_payment',
      }
    );

    assertEquals(result.ok, true);
    assertEquals(result.total_minor, 2000);
    assertEquals(captured !== null, true);
    const snap = captured!.pricing_snapshot as {
      version: number;
      total_minor: number;
    };
    assertEquals(snap.version, 1);
    assertEquals(snap.total_minor, 2000);
  }
);
