import { supabase } from '@/integrations/supabase/client';

export async function fetchRateLimitEntries(limit = 100) {
  const { data, error } = await supabase
    .from('rate_limits')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function deleteRateLimitEntriesBeforeWindowStart(cutoffIso: string) {
  const { error } = await supabase
    .from('rate_limits')
    .delete()
    .lt('window_start', cutoffIso);
  if (error) throw error;
}
