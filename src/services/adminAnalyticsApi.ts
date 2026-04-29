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

/** Paid orders in range with no pricing_snapshot (ops / drift indicator). */
export async function fetchPaidOrdersMissingPricingSnapshotCount(
  startIso: string,
  endIso: string
): Promise<number> {
  const { count, error } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'paid')
    .is('pricing_snapshot', null)
    .gte('created_at', startIso)
    .lte('created_at', endIso);
  if (error) throw error;
  return count ?? 0;
}
