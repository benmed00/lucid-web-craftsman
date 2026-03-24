import { supabase } from '@/integrations/supabase/client';

export type DashboardOrderWithProfile = {
  id: string;
  user_id: string | null;
  amount: number | null;
  status: string | null;
  currency: string | null;
  created_at: string;
  profiles: { full_name: string | null } | null;
};

export async function fetchRecentOrdersWithProfilesForDashboard(
  limit: number
): Promise<DashboardOrderWithProfile[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(
      `
      id,
      user_id,
      amount,
      status,
      currency,
      created_at,
      profiles (full_name)
    `
    )
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as DashboardOrderWithProfile[];
}

export async function fetchProfilesExactCount(): Promise<number> {
  const { count, error } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}
