import { supabase } from '@/integrations/supabase/client';

export async function fetchSecurityEventsRecent(limit = 50) {
  const { data, error } = await supabase
    .from('security_events')
    .select('*')
    .order('detected_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function resolveSecurityEventById(eventId: string) {
  const { error } = await supabase
    .from('security_events')
    .update({
      resolved_at: new Date().toISOString(),
      resolution_notes: "Résolu par l'administrateur",
    })
    .eq('id', eventId);
  if (error) throw error;
}

export async function fetchAuditLogsRecent(limit = 100) {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export function subscribeSecurityEventsAll(onEvent: () => void): () => void {
  const channel = supabase
    .channel('security_events_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'security_events' },
      () => onEvent()
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeAuditLogsAll(onEvent: () => void): () => void {
  const channel = supabase
    .channel('audit_logs_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'audit_logs' },
      () => onEvent()
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
