import { supabase } from '@/integrations/supabase/client';

/** Lightweight DB reachability check for admin status UI. */
export function pingProductsTableIds() {
  return supabase.from('products').select('id').limit(1);
}

export function listSupabaseStorageBuckets() {
  return supabase.storage.listBuckets();
}

export type EmailLogHealthRow = {
  status: string | null;
  sent_at: string | null;
};

export function fetchRecentEmailLogsForHealth(limit = 5) {
  return supabase
    .from('email_logs')
    .select('status, sent_at')
    .order('sent_at', { ascending: false })
    .limit(limit);
}
