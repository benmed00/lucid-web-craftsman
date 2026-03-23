import { supabase } from '@/integrations/supabase/client';

export async function fetchLoyaltyPointsRow(userId: string) {
  const { data, error } = await supabase
    .from('loyalty_points')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function initLoyaltyAccountRpc(userId: string): Promise<void> {
  const { error } = await supabase.rpc('init_loyalty_account', {
    p_user_id: userId,
  });
  if (error) throw error;
}

export async function fetchLoyaltyTransactions(userId: string, limit = 10) {
  const { data, error } = await supabase
    .from('loyalty_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function fetchActiveLoyaltyRewards() {
  const { data, error } = await supabase
    .from('loyalty_rewards')
    .select('*')
    .eq('is_active', true)
    .order('points_cost', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function insertLoyaltyRedemption(row: {
  user_id: string;
  reward_id: string;
  points_spent: number;
  status: string;
}): Promise<void> {
  const { error } = await supabase.from('loyalty_redemptions').insert(row);
  if (error) throw error;
}

export async function addLoyaltyPointsRpc(params: {
  p_user_id: string;
  p_points: number;
  p_source_type: string;
  p_source_id: string;
  p_description: string;
}): Promise<void> {
  const { error } = await supabase.rpc('add_loyalty_points', params);
  if (error) throw error;
}
