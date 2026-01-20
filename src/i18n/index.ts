// i18n configuration for Rif Raw Straw
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import French translations
import frCommon from './locales/fr/common.json';
import frProducts from './locales/fr/products.json';
import frCheckout from './locales/fr/checkout.json';
import frAuth from './locales/fr/auth.json';
import frErrors from './locales/fr/errors.json';
import frPages from './locales/fr/pages.json';

// Import English translations
import enCommon from './locales/en/common.json';
import enProducts from './locales/en/products.json';
import enCheckout from './locales/en/checkout.json';
import enAuth from './locales/en/auth.json';
import enErrors from './locales/en/errors.json';
import enPages from './locales/en/pages.json';

// Define available languages
export const supportedLanguages = ['fr', 'en'] as const;
export type SupportedLanguage = typeof supportedLanguages[number];

// Language metadata
export const languageConfig: Record<SupportedLanguage, { 
  name: string; 
  nativeName: string; 
  dir: 'ltr' | 'rtl';
  flag: string;
}> = {
  fr: { name: 'French', nativeName: 'Français', dir: 'ltr', flag: '🇫🇷' },
  en: { name: 'English', nativeName: 'English', dir: 'ltr', flag: '🇬🇧' },
};

// Default namespace
export const defaultNS = 'common';

// All namespaces
export const namespaces = ['common', 'products', 'checkout', 'auth', 'errors', 'pages'] as const;
export type Namespace = typeof namespaces[number];

// Resources structure
export const resources = {
  fr: {
    common: frCommon,
    products: frProducts,
    checkout: frCheckout,
    auth: frAuth,
    errors: frErrors,
    pages: frPages,
  },
  en: {
    common: enCommon,
    products: enProducts,
    checkout: enCheckout,
    auth: enAuth,
    errors: enErrors,
    pages: enPages,
  },
} as const;

// Initialize i18next with React binding included
if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: 'fr',
      defaultNS,
      ns: namespaces,
      
      // Language detection options
      detection: {
        order: ['localStorage', 'navigator', 'htmlTag'],
        lookupLocalStorage: 'i18nextLng',
        caches: ['localStorage'],
      },
      
      interpolation: {
        escapeValue: false, // React already escapes
      },
      
      // Disable suspense mode to avoid React context issues
      react: {
        useSuspense: false,
      },
      
      // Debug in development
      debug: import.meta.env.DEV,
    });
}

// Update HTML lang and dir attributes when language changes
i18n.on('languageChanged', (lng: string) => {
  const language = lng as SupportedLanguage;
  const config = languageConfig[language] || languageConfig.fr;
  
  if (typeof document !== 'undefined') {
    document.documentElement.lang = language;
    document.documentElement.dir = config.dir;
  }
});

// Set initial lang attribute
if (typeof document !== 'undefined' && i18n.language) {
  const currentLang = i18n.language as SupportedLanguage;
  const config = languageConfig[currentLang] || languageConfig.fr;
  document.documentElement.lang = currentLang || 'fr';
  document.documentElement.dir = config.dir;
}

export default i18n;
