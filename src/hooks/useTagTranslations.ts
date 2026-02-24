import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TagTranslation {
  id: string;
  tag_key: string;
  fr: string;
  en: string | null;
  ar: string | null;
  es: string | null;
  de: string | null;
  created_at: string;
  updated_at: string;
}

type LocaleCode = 'fr' | 'en' | 'ar' | 'es' | 'de';

export const useTagTranslations = () => {
  return useQuery({
    queryKey: ['tag-translations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tag_translations')
        .select('*')
        .order('tag_key');

      if (error) throw error;
      return data as TagTranslation[];
    },
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });
};

// Hook to get a translation function
export const useTranslateTag = () => {
  const { data: translations } = useTagTranslations();

  const translateTag = (tag: string, locale: string): string => {
    if (!translations) return tag;

    const langCode = (locale?.split('-')[0] || 'fr') as LocaleCode;
    const translation = translations.find((t) => t.tag_key === tag);

    if (translation) {
      const translated = translation[langCode];
      if (translated) return translated;
      // Fallback to French if translation not available
      return translation.fr;
    }

    return tag; // Return original if no translation found
  };

  return { translateTag, translations, isLoading: !translations };
};
