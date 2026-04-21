import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { looksLikeOrderUuid } from '@/lib/checkout/orderUuid';
import {
  invokeOrderLookup,
  type OrderLookupInvokeBody,
} from '@/services/checkoutApi';

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

  return useQuery({
    queryKey: ['order', 'lookup', body],
    queryFn: async (): Promise<OrderLookupApiRow> => {
      if (!body) throw new Error('Missing order lookup key');
      const { data, error } = await invokeOrderLookup(body);
      if (error) throw error;
      return (data || {}) as OrderLookupApiRow;
    },
    enabled: options.enabled && !!body,
    refetchInterval: (q) => {
      const row = q.state.data as OrderLookupApiRow | undefined;
      if (!row) return 2500;
      if (row.found === false) return false;
      if (row.is_paid) return false;
      return 2500;
    },
    staleTime: 15_000,
  });
}
