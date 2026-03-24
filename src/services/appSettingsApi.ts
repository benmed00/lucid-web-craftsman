import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type AppSettingInsert = Database['public']['Tables']['app_settings']['Insert'];
type AppSettingUpdate = Database['public']['Tables']['app_settings']['Update'];

export async function fetchAppSettingsKeyValuePairs(): Promise<
  { setting_key: string; setting_value: unknown }[]
> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('setting_key, setting_value');
  if (error) throw error;
  return data ?? [];
}

/** Upsert JSON blob by `setting_key` (admin settings tabs). */
export async function upsertAppSettingJsonByKey(key: string, value: unknown) {
  const jsonValue = JSON.parse(JSON.stringify(value)) as NonNullable<
    AppSettingInsert['setting_value']
  >;
  const existing = await fetchAppSettingIdValueMaybe(key);
  if (existing) {
    await updateAppSettingByKey(key, {
      setting_value: jsonValue,
      updated_at: new Date().toISOString(),
    });
  } else {
    await insertAppSettingRows([
      {
        setting_key: key,
        setting_value: jsonValue,
        description: `${key} configuration`,
      },
    ]);
  }
}

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
