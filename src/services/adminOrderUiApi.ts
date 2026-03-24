import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import type { Database } from '@/integrations/supabase/types';

type DiscountCouponUsageCountRow = Pick<
  Database['public']['Tables']['discount_coupons']['Row'],
  'usage_count'
>;

export async function fetchFraudAssessmentLatestForOrder(orderId: string) {
  const { data, error } = await supabase
    .from('fraud_assessments')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function rpcOverrideFraudAssessment(args: {
  orderId: string;
  action: 'approve' | 'reject';
  reason: string;
}) {
  return supabase.rpc('override_fraud_assessment', {
    p_order_id: args.orderId,
    p_action: args.action,
    p_reason: args.reason,
  });
}

export async function fetchOrderStripePaymentFields(orderId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('metadata, payment_method, payment_reference, stripe_session_id')
    .eq('id', orderId)
    .single();
  if (error) throw error;
  return data;
}

export async function fetchOrderAmountAndOrderStatus(orderId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('amount, order_status')
    .eq('id', orderId)
    .single();
  if (error) throw error;
  return data;
}

export async function fetchOrderMetadataOnly(orderId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('metadata')
    .eq('id', orderId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateOrderMetadataAmountAndTimestamp(args: {
  orderId: string;
  metadata: Json;
  amount: number;
}) {
  const { error } = await supabase
    .from('orders')
    .update({
      metadata: args.metadata,
      amount: args.amount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', args.orderId);
  if (error) throw error;
}

export async function bumpDiscountCouponUsageCountByCode(code: string) {
  const upper = code.toUpperCase();
  const { data: row } = await supabase
    .from('discount_coupons')
    .select('usage_count')
    .eq('code', upper)
    .single();
  const typed = row as DiscountCouponUsageCountRow | null;
  const next = (typed?.usage_count ?? 0) + 1;
  await supabase
    .from('discount_coupons')
    .update({ usage_count: next })
    .eq('code', upper);
}

export async function updateOrderTrackingFields(
  orderId: string,
  patch: {
    carrier: string | null;
    tracking_number: string | null;
    tracking_url: string | null;
  }
) {
  const { error } = await supabase
    .from('orders')
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);
  if (error) throw error;
}

export async function updateOrderInternalNotes(
  orderId: string,
  internalNotes: string | null
) {
  const { error } = await supabase
    .from('orders')
    .update({
      internal_notes: internalNotes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);
  if (error) throw error;
}

export async function fetchOrderCustomerAddressFields(orderId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('user_id, shipping_address, billing_address, metadata')
    .eq('id', orderId)
    .single();
  if (error) throw error;
  return data;
}

export async function fetchRecentOrdersForUser(userId: string, limit = 5) {
  const { data, error } = await supabase
    .from('orders')
    .select('id, created_at, amount, order_status')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function fetchCheckoutSessionsAdmin(
  statusFilter: string,
  limit = 100
) {
  let q = supabase
    .from('checkout_sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (statusFilter !== 'all') {
    q = q.eq('status', statusFilter);
  }
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function fetchProfilesIdFullNameOrdered() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .order('full_name');
  if (error) throw error;
  return data ?? [];
}

export async function fetchActiveProductsForManualOrder() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function insertManualAdminOrder(row: {
  user_id: string;
  amount: number;
  status: string;
  currency: string;
}) {
  const { data, error } = await supabase
    .from('orders')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function insertOrderItemsRows(
  rows: {
    order_id: string;
    product_id: number;
    quantity: number;
    unit_price: number;
    total_price: number;
    product_snapshot: Json;
  }[]
) {
  const { error } = await supabase.from('order_items').insert(rows);
  if (error) throw error;
}
