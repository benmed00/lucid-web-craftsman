/**
 * Single place that turns a Stripe Checkout Session into an authoritative
 * `orders.pricing_snapshot` (+ minor-unit columns) on our side.
 *
 * ALL three confirmation paths — stripe-webhook, verify-payment, reconcile-payment —
 * must call this after `confirmOrderFromStripe` succeeds, so the email + SPA
 * + admin UI all see the same Stripe-sourced pricing regardless of which
 * path confirmed the order.
 *
 * Failures are non-fatal for the confirmation, but are audited into
 * `payment_events` as `pricing_snapshot_persist_failed` so silent drift is
 * visible in ops dashboards.
 */
import type Stripe from 'https://esm.sh/stripe@18.5.0';

import { buildPricingSnapshotV1FromStripe } from './pricing-snapshot.ts';

export interface PersistSnapshotInput {
  orderId: string;
  session: Stripe.Checkout.Session;
  source: 'stripe_webhook' | 'verify_payment' | 'reconcile_payment';
  correlationId?: string | null;
}

export interface PersistSnapshotResult {
  ok: boolean;
  total_minor?: number;
  error?: string;
}

/**
 * Lists Stripe line items for `session` and writes an immutable v1 snapshot
 * to `orders.pricing_snapshot`, plus the mirror minor-unit columns.
 */
export async function persistPricingSnapshot(
  supabase: any,
  stripe: Stripe,
  input: PersistSnapshotInput
): Promise<PersistSnapshotResult> {
  const { orderId, session, source, correlationId } = input;

  try {
    const lineItemsResp = await stripe.checkout.sessions.listLineItems(
      session.id,
      { limit: 100 }
    );
    const snapshot = buildPricingSnapshotV1FromStripe(
      session,
      lineItemsResp.data
    );

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        pricing_snapshot: snapshot,
        subtotal_amount: snapshot.subtotal_minor,
        discount_amount: snapshot.discount_minor,
        shipping_amount: snapshot.shipping_minor,
        total_amount: snapshot.total_minor,
        currency: snapshot.currency,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    console.log(
      `[PRICING-SNAPSHOT][${source}] Persisted`,
      JSON.stringify({ orderId, total_minor: snapshot.total_minor })
    );

    return { ok: true, total_minor: snapshot.total_minor };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[PRICING-SNAPSHOT][${source}] Persistence failed:`, message);
    try {
      await supabase.from('payment_events').insert({
        order_id: orderId,
        correlation_id: correlationId || null,
        event_type: 'pricing_snapshot_persist_failed',
        status: 'warning',
        actor: source,
        error_message: message,
        details: {
          session_id: session.id,
        },
      });
    } catch {
      // Event logging is best-effort.
    }
    return { ok: false, error: message };
  }
}
