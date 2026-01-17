// Language store for managing the current locale
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n, { type SupportedLanguage, supportedLanguages, languageConfig } from '@/i18n';

interface LanguageState {
  locale: SupportedLanguage;
  setLocale: (locale: SupportedLanguage) => void;
  isRTL: () => boolean;
  getLanguageConfig: () => typeof languageConfig[SupportedLanguage];
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      locale: (i18n.language as SupportedLanguage) || 'fr',
      
      setLocale: (locale: SupportedLanguage) => {
        if (!supportedLanguages.includes(locale)) {
          console.warn(`Unsupported language: ${locale}`);
          return;
        }
        
        // Update i18next
        i18n.changeLanguage(locale);
        
        // Update store
        set({ locale });
        
        // Update HTML attributes
        const config = languageConfig[locale];
        document.documentElement.lang = locale;
        document.documentElement.dir = config.dir;
      },
      
      isRTL: () => {
        const { locale } = get();
        return languageConfig[locale]?.dir === 'rtl';
      },
      
      getLanguageConfig: () => {
        const { locale } = get();
        return languageConfig[locale] || languageConfig.fr;
      },
    }),
    {
      name: 'language-storage',
      partialize: (state) => ({ locale: state.locale }),
      onRehydrateStorage: () => (state) => {
        // Sync i18next with stored locale on rehydration
        if (state?.locale) {
          i18n.changeLanguage(state.locale);
        }
      },
    }
  )
);

// Selector hooks for optimized re-renders
export const useLocale = () => useLanguageStore((state) => state.locale);
export const useSetLocale = () => useLanguageStore((state) => state.setLocale);
export const useIsRTL = () => useLanguageStore((state) => state.isRTL());

// Initialize language store (call this in main.tsx)
export const initializeLanguageStore = () => {
  const state = useLanguageStore.getState();
  // Ensure i18n and store are in sync
  if (state.locale !== i18n.language) {
    i18n.changeLanguage(state.locale);
  }
};
