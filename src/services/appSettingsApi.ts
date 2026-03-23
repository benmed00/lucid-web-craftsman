import { supabase } from '@/integrations/supabase/client';

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
