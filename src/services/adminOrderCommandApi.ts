import { supabase } from '@/integrations/supabase/client';

export async function fetchOrderItemsProductQtyForOrder(orderId: string) {
  const { data, error } = await supabase
    .from('order_items')
    .select('product_id, quantity')
    .eq('order_id', orderId);
  if (error) throw error;
  return data ?? [];
}

export async function fetchProductsIdNamePriceByIds(productIds: number[]) {
  if (productIds.length === 0) return [];
  const { data, error } = await supabase
    .from('products')
    .select('id, name, price')
    .in('id', productIds);
  if (error) throw error;
  return data ?? [];
}

export async function fetchOrderPaymentSummary(orderId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('payment_method, payment_reference, amount, currency')
    .eq('id', orderId)
    .single();
  if (error) throw error;
  return data;
}

export async function fetchOrderUserIdOnly(orderId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('user_id')
    .eq('id', orderId)
    .single();
  if (error) throw error;
  return data;
}
