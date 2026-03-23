import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type ArtisanRowPick = Pick<
  Database['public']['Tables']['artisans']['Row'],
  | 'id'
  | 'name'
  | 'specialty'
  | 'photo_url'
  | 'region'
  | 'experience_years'
  | 'bio_short'
  | 'quote'
>;

export type ArtisanTranslationJoined = Pick<
  Database['public']['Tables']['artisan_translations']['Row'],
  'locale' | 'specialty' | 'quote' | 'bio_short'
>;

export type ArtisanJoinRow = ArtisanRowPick & {
  artisan_translations: ArtisanTranslationJoined[] | null;
};

export async function fetchActiveArtisansWithTranslations(): Promise<
  ArtisanJoinRow[]
> {
  const { data, error } = await supabase
    .from('artisans')
    .select(
      `
          id,
          name,
          specialty,
          photo_url,
          region,
          experience_years,
          bio_short,
          quote,
          artisan_translations!left (
            locale,
            specialty,
            quote,
            bio_short
          )
        `
    )
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(4);

  if (error) throw error;
  return (data ?? []) as ArtisanJoinRow[];
}
