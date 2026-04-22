import { supabase } from '@/integrations/supabase/client';
import type {
  OrderFilters,
  OrderStatus,
  OrderStatusHistory,
  OrderAnomaly,
  OrderStateTransition,
} from '@/types/order.types';

const ORDERS_LIST_SELECT = `
          *,
          order_items (
            id, product_id, quantity, unit_price, total_price, product_snapshot
          )
        `;

/** Admin list/detail including payment rows (legacy AdminOrders page). */
const ORDERS_ADMIN_WITH_PAYMENTS_SELECT = `
          *,
          order_items (
            id,
            product_id,
            quantity,
            unit_price,
            total_price,
            product_snapshot
          ),
          payments (
            id,
            status,
            amount,
            processed_at
          )
        `;

export async function fetchAdminOrdersListWithPayments() {
  const { data, error } = await supabase
    .from('orders')
    .select(ORDERS_ADMIN_WITH_PAYMENTS_SELECT)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchAdminOrderByIdWithPayments(orderId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select(ORDERS_ADMIN_WITH_PAYMENTS_SELECT)
    .eq('id', orderId)
    .single();
  if (error) throw error;
  return data;
}

/** Updates the legacy string `status` column used by the macro admin orders UI. */
export async function updateOrderLegacyStatusField(
  orderId: string,
  newStatus: string
) {
  const { error } = await supabase
    .from('orders')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);
  if (error) throw error;
}

/** Test / notification hook: only `status` (no `updated_at`). */
export async function updateOrderLegacyStatusColumnOnly(
  orderId: string,
  newStatus: string
) {
  const { error } = await supabase
    .from('orders')
    .update({ status: newStatus })
    .eq('id', orderId);
  if (error) throw error;
}

export type OrdersTableRealtimeAnyPayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, unknown> & { id: string };
  old: Record<string, unknown> & { id: string };
};

export function subscribeOrdersTableAllEvents(
  onPayload: (payload: OrdersTableRealtimeAnyPayload) => void
): () => void {
  const channel = supabase
    .channel('orders-realtime-admin-list')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders' },
      (payload) =>
        onPayload(payload as unknown as OrdersTableRealtimeAnyPayload)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function fetchAdminOrdersFiltered(filters?: OrderFilters) {
  let query = supabase
    .from('orders')
    .select(ORDERS_LIST_SELECT)
    .order('created_at', { ascending: false });

  if (filters?.status?.length) {
    query = query.in('order_status', filters.status);
  }
  if (filters?.hasAnomaly !== undefined) {
    query = query.eq('has_anomaly', filters.hasAnomaly);
  }
  if (filters?.requiresAttention !== undefined) {
    query = query.eq('requires_attention', filters.requiresAttention);
  }
  if (filters?.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }
  if (filters?.dateTo) {
    query = query.lte('created_at', filters.dateTo);
  }
  if (filters?.carrier) {
    query = query.eq('carrier', filters.carrier);
  }
  if (filters?.search) {
    query = query.or(
      `id.ilike.%${filters.search}%,tracking_number.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query.limit(100);
  if (error) throw error;
  return data;
}

export async function fetchAdminOrderById(orderId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select(ORDERS_LIST_SELECT)
    .eq('id', orderId)
    .single();
  if (error) throw error;
  return data;
}

export async function fetchOrderStatusHistoryRows(orderId: string) {
  const { data, error } = await supabase
    .from('order_status_history')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as OrderStatusHistory[];
}

export async function fetchOrderAnomaliesRows(
  orderId: string | undefined,
  unresolvedOnly: boolean
) {
  let query = supabase
    .from('order_anomalies')
    .select('*')
    .order('detected_at', { ascending: false });

  if (orderId) {
    query = query.eq('order_id', orderId);
  }
  if (unresolvedOnly) {
    query = query.is('resolved_at', null);
  }

  const { data, error } = await query.limit(100);
  if (error) throw error;
  return data as OrderAnomaly[];
}

export async function fetchValidTransitionsFromStatus(
  currentStatus: OrderStatus
) {
  const { data, error } = await supabase
    .from('order_state_transitions')
    .select('*')
    .eq('from_status', currentStatus);
  if (error) throw error;
  return data as OrderStateTransition[];
}

export async function fetchOrderStatsProjectionRows() {
  const { data, error } = await supabase
    .from('orders')
    .select('order_status, has_anomaly, requires_attention');
  if (error) throw error;
  return data ?? [];
}

export async function rpcUpdateOrderStatus(args: {
  orderId: string;
  newStatus: OrderStatus;
  actorUserId: string | undefined;
  reasonCode?: string;
  reasonMessage?: string;
}) {
  return supabase.rpc('update_order_status', {
    p_order_id: args.orderId,
    p_new_status: args.newStatus,
    p_actor: 'admin',
    p_actor_user_id: args.actorUserId,
    p_reason_code: args.reasonCode || null,
    p_reason_message: args.reasonMessage || null,
    p_metadata: {},
  });
}

export async function rpcResolveOrderAnomaly(args: {
  anomalyId: string;
  resolvedBy: string | undefined;
  resolutionNotes: string;
  resolutionAction?: string | null;
}) {
  return supabase.rpc('resolve_order_anomaly', {
    p_anomaly_id: args.anomalyId,
    p_resolved_by: args.resolvedBy,
    p_resolution_notes: args.resolutionNotes,
    p_resolution_action: args.resolutionAction || null,
  });
}

export async function rpcGetOrderCustomerView(args: {
  orderId: string;
  userId: string;
  locale: string;
}) {
  return supabase.rpc('get_order_customer_view', {
    p_order_id: args.orderId,
    p_user_id: args.userId,
    p_locale: args.locale,
  });
}

export async function fetchCustomerOrdersSummaryList(userId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select(
      `
          id,
          order_status,
          amount,
          currency,
          tracking_number,
          carrier,
          estimated_delivery,
          created_at,
          order_items (
            id, quantity, product_snapshot
          )
        `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export type OrderRealtimePayload = {
  old: { order_status?: string; id: string };
  new: { order_status?: string; id: string };
};

export function subscribeOrdersTableUpdates(
  orderId: string | undefined,
  onEvent: (payload: OrderRealtimePayload) => void
): () => void {
  const channel = supabase
    .channel('order-updates')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: orderId ? `id=eq.${orderId}` : undefined,
      },
      (payload) => onEvent(payload as unknown as OrderRealtimePayload)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
