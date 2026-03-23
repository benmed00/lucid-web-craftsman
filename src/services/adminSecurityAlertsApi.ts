import { supabase } from '@/integrations/supabase/client';

export async function fetchSecurityAlertsRows() {
  const { data, error } = await supabase
    .from('security_alerts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function resolveSecurityAlertById(id: string, notes: string) {
  const { error } = await supabase
    .from('security_alerts')
    .update({
      is_resolved: true,
      resolved_at: new Date().toISOString(),
      resolution_notes: notes,
    })
    .eq('id', id);
  if (error) throw error;
}
