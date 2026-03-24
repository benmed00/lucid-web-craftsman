import { supabase } from '@/integrations/supabase/client';

export async function fetchEmailLogsAdmin(limit: number) {
  const { data, error } = await supabase
    .from('email_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
