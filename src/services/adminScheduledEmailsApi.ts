import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type ScheduledInsert =
  Database['public']['Tables']['scheduled_emails']['Insert'];

export async function fetchScheduledEmailsOrdered() {
  const { data, error } = await supabase
    .from('scheduled_emails')
    .select('*')
    .order('scheduled_for', { ascending: true })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function insertScheduledEmailRow(row: ScheduledInsert) {
  const { error } = await supabase.from('scheduled_emails').insert(row);
  if (error) throw error;
}

export async function cancelScheduledEmailById(id: string) {
  const { error } = await supabase
    .from('scheduled_emails')
    .update({ status: 'cancelled' })
    .eq('id', id);
  if (error) throw error;
}
