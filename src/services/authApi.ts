import { supabase } from '@/integrations/supabase/client';

export async function signInWithPasswordForReauth(
  email: string,
  password: string
) {
  return supabase.auth.signInWithPassword({ email, password });
}

export function getAuthSession() {
  return supabase.auth.getSession();
}

/** Sign out the current session locally without hitting the global revoke endpoint. */
export async function signOutLocal() {
  return supabase.auth.signOut({ scope: 'local' });
}
