import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  OrderStatus,
  OrderStatusHistory,
  OrderAnomaly,
  OrderStateTransition,
  OrderFilters,
  OrderStats,
  CustomerOrderView,
} from '@/types/order.types';

// Use database types directly to avoid type conflicts
type DbOrder = {
  id: string;
  user_id: string | null;
  stripe_session_id: string | null;
  amount: number | null;
  currency: string;
  status: string;
  order_status: string;
  payment_method: string | null;
  payment_reference: string | null;
  fraud_score: number | null;
  fraud_flags: unknown;
  shipping_address: unknown;
  billing_address: unknown;
  customer_notes: string | null;
  internal_notes: string | null;
  estimated_delivery: string | null;
  actual_delivery: string | null;
  carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  retry_count: number;
  last_retry_at: string | null;
  has_anomaly: boolean;
  anomaly_count: number;
  requires_attention: boolean;
  attention_reason: string | null;
  metadata: unknown;
  created_at: string;
  updated_at: string;
  order_items?: Array<{
    id: string;
    product_id: number;
    quantity: number;
    unit_price: number;
    total_price: number;
    product_snapshot: unknown;
  }>;
};

// Fetch orders with filters (Admin)
export function useOrders(filters?: OrderFilters) {
  return useQuery({
    queryKey: ['orders', filters],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select(
          `
          *,
          order_items (
            id, product_id, quantity, unit_price, total_price, product_snapshot
          )
        `
        )
        .order('created_at', { ascending: false });

      // Apply filters
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
      return data as DbOrder[];
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Fetch single order with full details (Admin)
export function useOrder(orderId: string | null) {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      if (!orderId) return null;

      const { data, error } = await supabase
        .from('orders')
        .select(
          `
          *,
          order_items (
            id, product_id, quantity, unit_price, total_price, product_snapshot
          )
        `
        )
        .eq('id', orderId)
        .single();

      if (error) throw error;
      return data as DbOrder;
    },
    enabled: !!orderId,
  });
}

// Fetch order status history
export function useOrderHistory(orderId: string | null) {
  return useQuery({
    queryKey: ['order-history', orderId],
    queryFn: async () => {
      if (!orderId) return [];

      const { data, error } = await supabase
        .from('order_status_history')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as OrderStatusHistory[];
    },
    enabled: !!orderId,
  });
}

// Fetch order anomalies
export function useOrderAnomalies(
  orderId?: string | null,
  unresolvedOnly = false
) {
  return useQuery({
    queryKey: ['order-anomalies', orderId, unresolvedOnly],
    queryFn: async () => {
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
    },
    enabled: orderId !== '',
  });
}

// Fetch valid transitions for a status
export function useValidTransitions(currentStatus: OrderStatus | null) {
  return useQuery({
    queryKey: ['order-transitions', currentStatus],
    queryFn: async () => {
      if (!currentStatus) return [];

      const { data, error } = await supabase
        .from('order_state_transitions')
        .select('*')
        .eq('from_status', currentStatus);

      if (error) throw error;
      return data as OrderStateTransition[];
    },
    enabled: !!currentStatus,
  });
}

// Fetch order statistics
export function useOrderStats() {
  return useQuery({
    queryKey: ['order-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('order_status, has_anomaly, requires_attention');

      if (error) throw error;

      const stats: OrderStats = {
        total: data.length,
        pending_payment: data.filter((o) =>
          ['created', 'payment_pending'].includes(o.order_status)
        ).length,
        processing: data.filter((o) =>
          ['paid', 'validation_in_progress', 'validated', 'preparing'].includes(
            o.order_status
          )
        ).length,
        shipped: data.filter((o) =>
          ['shipped', 'in_transit'].includes(o.order_status)
        ).length,
        delivered: data.filter((o) => o.order_status === 'delivered').length,
        anomalies: data.filter((o) => o.has_anomaly).length,
        requires_attention: data.filter((o) => o.requires_attention).length,
      };

      return stats;
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

// Update order status mutation
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      newStatus,
      reasonCode,
      reasonMessage,
    }: {
      orderId: string;
      newStatus: OrderStatus;
      reasonCode?: string;
      reasonMessage?: string;
    }) => {
      // Call the database function for validated transitions
      const { data, error } = await supabase.rpc('update_order_status', {
        p_order_id: orderId,
        p_new_status: newStatus,
        p_actor: 'admin',
        p_actor_user_id: (await supabase.auth.getUser()).data.user?.id,
        p_reason_code: reasonCode || null,
        p_reason_message: reasonMessage || null,
        p_metadata: {},
      });

      if (error) throw error;

      const result = data as unknown as {
        success: boolean;
        order_id?: string;
        old_status?: string;
        new_status?: string;
        history_id?: string;
        auto_notify?: boolean;
        error?: string;
        message?: string;
      };
      if (!result.success) {
        throw new Error(
          result.message || result.error || 'Failed to update status'
        );
      }

      return result;
    },
    onSuccess: (result) => {
      toast.success(
        `Statut mis à jour: ${result.old_status} → ${result.new_status}`
      );
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', result.order_id] });
      queryClient.invalidateQueries({
        queryKey: ['order-history', result.order_id],
      });
      queryClient.invalidateQueries({ queryKey: ['order-stats'] });
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

// Resolve anomaly mutation
export function useResolveAnomaly() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      anomalyId,
      resolutionNotes,
      resolutionAction,
    }: {
      anomalyId: string;
      resolutionNotes: string;
      resolutionAction?: string;
    }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      const { data, error } = await supabase.rpc('resolve_order_anomaly', {
        p_anomaly_id: anomalyId,
        p_resolved_by: userId,
        p_resolution_notes: resolutionNotes,
        p_resolution_action: resolutionAction || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Anomalie résolue');
      queryClient.invalidateQueries({ queryKey: ['order-anomalies'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-stats'] });
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

// Customer order view hook
export function useCustomerOrder(orderId: string | null, locale = 'fr') {
  return useQuery({
    queryKey: ['customer-order', orderId, locale],
    queryFn: async () => {
      if (!orderId) return null;

      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('get_order_customer_view', {
        p_order_id: orderId,
        p_user_id: userId,
        p_locale: locale,
      });

      if (error) throw error;

      const result = data as unknown as CustomerOrderView & { error?: string };
      if (result?.error) throw new Error(result.error);

      return result as CustomerOrderView;
    },
    enabled: !!orderId,
  });
}

// Customer orders list hook
export function useCustomerOrders() {
  return useQuery({
    queryKey: ['customer-orders'],
    queryFn: async () => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('Not authenticated');

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
    },
  });
}

// Real-time order updates subscription
export function useOrderRealtimeUpdates(orderId?: string) {
  const queryClient = useQueryClient();

  const subscribe = useCallback(() => {
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
        (payload) => {
          // Invalidate relevant queries
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          queryClient.invalidateQueries({
            queryKey: ['order', payload.new.id],
          });
          queryClient.invalidateQueries({ queryKey: ['order-stats'] });

          // Show toast for important status changes
          if (payload.old.order_status !== payload.new.order_status) {
            toast.info(`Commande ${payload.new.id.slice(0, 8)} mise à jour`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, queryClient]);

  return { subscribe };
}
