import { supabase } from '@/integrations/supabase/client';

export function rpcVerifyAdminSession() {
  return supabase.rpc('verify_admin_session');
}

export function fetchAdminUserFullRow(userId: string) {
  return supabase
    .from('admin_users')
    .select('*')
    .eq('user_id', userId)
    .single();
}

export function fetchAdminIdLastLoginRow(userId: string) {
  return supabase
    .from('admin_users')
    .select('id, last_login')
    .eq('user_id', userId)
    .single();
}

export function touchAdminLastLogin(userId: string): void {
  void supabase
    .from('admin_users')
    .update({ last_login: new Date().toISOString() })
    .eq('user_id', userId);
}

export function updateAdminUsersByUserId(
  userId: string,
  patch: { name: string; role: string }
) {
  return supabase.from('admin_users').update(patch).eq('user_id', userId);
}
