import { supabase } from '@/integrations/supabase/client';

export async function fetchUserPreferencesRow(userId: string) {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertDefaultUserPreferences(userId: string) {
  const { data, error } = await supabase
    .from('user_preferences')
    .upsert(
      {
        user_id: userId,
        email_notifications: true,
        marketing_emails: false,
        order_updates: true,
        language: 'fr',
        currency: 'EUR',
        privacy_profile_public: false,
        privacy_show_email: false,
        privacy_show_phone: false,
      },
      { onConflict: 'user_id', ignoreDuplicates: true }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateUserPreferencesByRowId(
  rowId: string,
  updates: Record<string, unknown>
) {
  const { data, error } = await supabase
    .from('user_preferences')
    .update(updates)
    .eq('id', rowId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
