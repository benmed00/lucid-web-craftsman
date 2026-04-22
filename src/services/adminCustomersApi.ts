import { supabase } from '@/integrations/supabase/client';

export async function fetchAllProfilesOrdered() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchOrdersForCustomerStats() {
  const { data, error } = await supabase
    .from('orders')
    .select('id, user_id, amount, status, order_status, created_at');
  if (error) throw error;
  return data ?? [];
}

export async function fetchLoyaltyPointsAll() {
  const { data, error } = await supabase
    .from('loyalty_points')
    .select('user_id, points_balance, tier, total_points_earned');
  if (error) throw error;
  return data ?? [];
}

export function rpcGetUserEmailsForAdmin(userIds: string[]) {
  return supabase.rpc('get_user_emails_for_admin', {
    p_user_ids: userIds,
  });
}

export async function fetchCustomerOrdersWithItems(userId: string, limit = 30) {
  const { data, error } = await supabase
    .from('orders')
    .select(
      `
      id, amount, status, order_status, created_at, payment_method, tracking_number, carrier,
      order_items (id, product_id, quantity, unit_price, total_price, product_snapshot)
    `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function fetchCartItemsByUserId(userId: string) {
  const { data, error } = await supabase
    .from('cart_items')
    .select('id, product_id, quantity, created_at')
    .eq('user_id', userId);
  if (error) throw error;
  return data ?? [];
}
