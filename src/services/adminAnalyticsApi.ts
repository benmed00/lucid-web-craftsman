import { supabase } from '@/integrations/supabase/client';

const ORDERS_ANALYTICS_WITH_ITEMS = `
  id, amount, status, created_at, user_id,
  order_items(id, product_id, quantity, unit_price, total_price, product_snapshot)
`;

export async function fetchOrdersAnalyticsCurrentPeriod(
  startIso: string,
  endIso: string
) {
  const { data, error } = await supabase
    .from('orders')
    .select(ORDERS_ANALYTICS_WITH_ITEMS)
    .gte('created_at', startIso)
    .lte('created_at', endIso);
  if (error) throw error;
  return data ?? [];
}

export async function fetchOrdersAnalyticsPreviousPeriod(
  startIso: string,
  endIso: string
) {
  const { data, error } = await supabase
    .from('orders')
    .select('id, amount, status, created_at, user_id')
    .gte('created_at', startIso)
    .lte('created_at', endIso);
  if (error) throw error;
  return data ?? [];
}
