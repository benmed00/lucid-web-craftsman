import type { SupabaseClient } from '@supabase/supabase-js';

import type { PaymentEventInput } from '../types.ts';

export function createPaymentEventLogger(
  supabaseService: SupabaseClient
): (event: PaymentEventInput) => Promise<void> {
  return async (event: PaymentEventInput) => {
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
    } catch (err) {
      console.error('[CREATE-PAYMENT] Failed to log event:', err);
    }
  };
}
