import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type AbThemeTestRow =
  Database['public']['Tables']['ab_theme_tests']['Row'];
export type AbThemeTestUpdate =
  Database['public']['Tables']['ab_theme_tests']['Update'];

export async function fetchLatestAbThemeTest(): Promise<AbThemeTestRow | null> {
  const { data, error } = await supabase
    .from('ab_theme_tests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as AbThemeTestRow | null) ?? null;
}

export async function updateAbThemeTestById(
  id: string,
  patch: AbThemeTestUpdate
): Promise<void> {
  const { error } = await supabase
    .from('ab_theme_tests')
    .update(patch)
    .eq('id', id);
  if (error) throw error;
}

export async function resetAbThemeTestCounters(id: string): Promise<void> {
  await updateAbThemeTestById(id, {
    variant_a_views: 0,
    variant_b_views: 0,
    variant_a_add_to_cart: 0,
    variant_b_add_to_cart: 0,
    variant_a_checkout: 0,
    variant_b_checkout: 0,
  });
}
