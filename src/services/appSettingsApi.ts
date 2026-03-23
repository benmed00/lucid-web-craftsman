import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type AppSettingInsert = Database['public']['Tables']['app_settings']['Insert'];
type AppSettingUpdate = Database['public']['Tables']['app_settings']['Update'];

export async function fetchAppSettingValueByKey(
  settingKey: string
): Promise<unknown | null> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('setting_value')
    .eq('setting_key', settingKey)
    .maybeSingle();
  if (error && error.code !== 'PGRST116') throw error;
  return data?.setting_value ?? null;
}

/** `id` + `setting_value` when a row exists (admin upserts). */
export async function fetchAppSettingIdValueMaybe(settingKey: string) {
  const { data, error } = await supabase
    .from('app_settings')
    .select('id, setting_value')
    .eq('setting_key', settingKey)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateAppSettingByKey(
  settingKey: string,
  patch: AppSettingUpdate
) {
  const { error } = await supabase
    .from('app_settings')
    .update(patch)
    .eq('setting_key', settingKey);
  if (error) throw error;
}

export async function insertAppSettingRows(rows: AppSettingInsert[]) {
  const { error } = await supabase.from('app_settings').insert(rows);
  if (error) throw error;
}

export function subscribeAppSettingByKey(
  settingKey: string,
  onChange: (settingValue: unknown | null) => void
): () => void {
  const channel = supabase
    .channel(`app_settings:${settingKey}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'app_settings',
        filter: `setting_key=eq.${settingKey}`,
      },
      (payload) => {
        const row = payload.new;
        if (row && typeof row === 'object' && 'setting_value' in row) {
          onChange((row as { setting_value?: unknown }).setting_value ?? null);
        }
      }
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
