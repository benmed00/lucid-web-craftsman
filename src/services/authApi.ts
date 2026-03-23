import { supabase } from '@/integrations/supabase/client';

export async function signInWithPasswordForReauth(
  email: string,
  password: string
) {
  return supabase.auth.signInWithPassword({ email, password });
}
