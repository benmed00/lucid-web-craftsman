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

export type ArtisanFullRow = Database['public']['Tables']['artisans']['Row'];

export type ArtisanFullTranslationJoined = Pick<
  Database['public']['Tables']['artisan_translations']['Row'],
  'locale' | 'specialty' | 'quote' | 'bio_short' | 'bio'
>;

export type ArtisanFullJoinRow = ArtisanFullRow & {
  artisan_translations: ArtisanFullTranslationJoined[] | null;
};

/** Full artisan rows + translations for the public Artisans page. */
export async function fetchActiveArtisansFullWithTranslations(): Promise<
  ArtisanFullJoinRow[]
> {
  const { data, error } = await supabase
    .from('artisans')
    .select(
      `
          *,
          artisan_translations!left (
            locale, specialty, quote, bio_short, bio
          )
        `
    )
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as ArtisanFullJoinRow[];
}
