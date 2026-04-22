import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export async function logUserProductSearchActivity(args: {
  description: string;
  metadata: Json;
}): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.rpc('log_user_activity', {
    p_user_id: user.id,
    p_activity_type: 'PRODUCT_SEARCH',
    p_description: args.description,
    p_metadata: args.metadata,
  });
  if (error) throw error;
}

export async function fetchAuditLogsProductSearchSince(
  createdAtGte: string
): Promise<
  Array<{
    new_values: Json | null;
    created_at: string | null;
  }>
> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('new_values, created_at')
    .eq('action', 'PRODUCT_SEARCH')
    .gte('created_at', createdAtGte)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Array<{
    new_values: Json | null;
    created_at: string | null;
  }>;
}
