import { supabase } from '@/integrations/supabase/client';

export type TagTranslationWrite = {
  tag_key: string;
  fr: string;
  en: string | null;
  ar: string | null;
  es: string | null;
  de: string | null;
};

export async function fetchAllTagTranslations() {
  const { data, error } = await supabase
    .from('tag_translations')
    .select('*')
    .order('tag_key');
  if (error) throw error;
  return data ?? [];
}

export async function insertTagTranslation(row: TagTranslationWrite) {
  const { error } = await supabase.from('tag_translations').insert(row);
  if (error) throw error;
}

export async function updateTagTranslationById(
  id: string,
  row: TagTranslationWrite
) {
  const { error } = await supabase
    .from('tag_translations')
    .update({
      tag_key: row.tag_key,
      fr: row.fr,
      en: row.en,
      ar: row.ar,
      es: row.es,
      de: row.de,
    })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteTagTranslationById(id: string) {
  const { error } = await supabase
    .from('tag_translations')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
