import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type AbRow = Database['public']['Tables']['email_ab_tests']['Insert'];
type AbUpdate = Database['public']['Tables']['email_ab_tests']['Update'];

export async function fetchEmailAbTestsRecent(limit = 20) {
  const { data, error } = await supabase
    .from('email_ab_tests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function insertEmailAbTestRow(row: AbRow) {
  const { error } = await supabase.from('email_ab_tests').insert(row);
  if (error) throw error;
}

export async function updateEmailAbTestById(id: string, patch: AbUpdate) {
  const { error } = await supabase
    .from('email_ab_tests')
    .update(patch)
    .eq('id', id);
  if (error) throw error;
}
