import { supabase } from '@/integrations/supabase/client';

export async function fetchIsAdminUserForCartPolicy(
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_admin_user', {
    user_uuid: userId,
  });
  return !error && data === true;
}
