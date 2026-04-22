import { useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';

import { looksLikeOrderUuid } from '@/lib/checkout/orderUuid';
import {
  invokeOrderLookup,
  type OrderLookupInvokeBody,
} from '@/services/checkoutApi';

/**
 * Stop polling only after this many consecutive `found:false` responses.
 *
 * The webhook + DB insert race (and read-replica lag) means the first lookup
 * after returning from Stripe can legitimately miss the order. Giving up
 * immediately stranded paying customers on a "we can't find your order"
 * screen; 5 attempts at the 2.5s poll interval ≈ 12.5s of grace, which is
 * well inside normal webhook latency.
 */
const FOUND_FALSE_RETRY_BUDGET = 5;

export type OrderLookupApiRow = {
  found?: boolean;
  order_id?: string;
  status?: string;
  order_status?: string;
  is_paid?: boolean;
  webhook_processed?: boolean;
  amount?: number;
  currency?: string;
  created_at?: string;
  pricing_snapshot?: unknown;
  subtotal_amount?: number | null;
  discount_amount?: number | null;
  shipping_amount?: number | null;
  total_amount?: number | null;
  order_items?: Array<{
    id: string;
    product_id: number;
    quantity: number;
    unit_price: number;
    total_price: number;
    product_snapshot?: {
      name?: string;
      images?: string[];
    } | null;
  }>;
};

/**
 * Polls order-lookup until the order exists / is paid (webhook landed).
 * Prefers `order_id`; falls back to legacy `session_id` (`cs_*` or mis-encoded UUID).
 */
export function usePaymentOrderLookup(
  keys: { orderId: string | null; sessionId: string | null },
  options: { enabled: boolean }
) {
  const body = useMemo((): OrderLookupInvokeBody | null => {
    const oid = keys.orderId?.trim() || '';
    if (oid && looksLikeOrderUuid(oid)) return { order_id: oid };
    const sid = keys.sessionId?.trim() || '';
    if (sid) return { session_id: sid };
    return null;
  }, [keys.orderId, keys.sessionId]);

  // Tracks consecutive `found:false` responses for the current body. Reset
  // whenever the lookup key changes.
  const missCountRef = useRef<{ key: string; count: number }>({
    key: '',
    count: 0,
  });
  const bodyKey = useMemo(() => (body ? JSON.stringify(body) : ''), [body]);
  if (missCountRef.current.key !== bodyKey) {
    missCountRef.current = { key: bodyKey, count: 0 };
  }

  return useQuery({
    queryKey: ['order', 'lookup', body],
    queryFn: async (): Promise<OrderLookupApiRow> => {
      if (!body) throw new Error('Missing order lookup key');
      const { data, error } = await invokeOrderLookup(body);
      if (error) throw error;
      const row = (data || {}) as OrderLookupApiRow;
      if (row.found === false) {
        missCountRef.current.count += 1;
      } else if (row.found === true) {
        missCountRef.current.count = 0;
      }
      return row;
    },
    enabled: options.enabled && !!body,
    refetchInterval: (q) => {
      const row = q.state.data as OrderLookupApiRow | undefined;
      if (!row) return 2500;
      if (row.is_paid) return false;
      // Give the webhook + DB insert a few seconds of grace before giving up.
      if (
        row.found === false &&
        missCountRef.current.count >= FOUND_FALSE_RETRY_BUDGET
      ) {
        return false;
      }
      return 2500;
    },
    staleTime: 15_000,
  });
}
