/**
 * Orders, line items, and related **Postgres enums** (single source — no duplicated string unions).
 *
 * @see {@link OrderRow} vs {@link Order} in `order.types.ts` — the latter is a composite admin/UI aggregate, not a raw row.
 */
import type { Database } from '@/integrations/supabase/types';

export type OrderRow = Database['public']['Tables']['orders']['Row'];
export type OrderInsert = Database['public']['Tables']['orders']['Insert'];
export type OrderUpdate = Database['public']['Tables']['orders']['Update'];

export type OrderItemRow = Database['public']['Tables']['order_items']['Row'];

/** Postgres `order_status` — use this instead of hand-written string unions */
export type OrderStatus = Database['public']['Enums']['order_status'];

export type AnomalyType = Database['public']['Enums']['order_anomaly_type'];
export type AnomalySeverity = Database['public']['Enums']['anomaly_severity'];
export type StatusChangeActor =
  Database['public']['Enums']['status_change_actor'];
export type AdminOrderPermission =
  Database['public']['Enums']['admin_order_permission'];
