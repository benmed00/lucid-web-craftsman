import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export async function insertAuditLogRow(entry: {
  user_id?: string | null;
  action: string;
  resource_type?: string | null;
  resource_id?: string | null;
  old_values?: Json | null;
  new_values?: Json | null;
}) {
  const { error } = await supabase.from('audit_logs').insert(entry);
  if (error) throw error;
}
