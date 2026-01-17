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

// Initialize i18next only if not already initialized
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
      
      // React specific options
      react: {
        useSuspense: false, // Disable suspense for now to avoid hydration issues
      },
      
      // Debug in development
      debug: false, // Disable debug to reduce console noise
    });
}

// Update HTML lang and dir attributes when language changes
i18n.on('languageChanged', (lng: string) => {
  const language = lng as SupportedLanguage;
  const config = languageConfig[language] || languageConfig.fr;
  
  document.documentElement.lang = lng;
  document.documentElement.dir = config.dir;
  
  // Update meta tag for SEO
  const ogLocale = document.querySelector('meta[property="og:locale"]');
  if (ogLocale) {
    ogLocale.setAttribute('content', lng === 'fr' ? 'fr_FR' : 'en_GB');
  }
});

// Set initial HTML attributes
const currentLang = i18n.language as SupportedLanguage;
const currentConfig = languageConfig[currentLang] || languageConfig.fr;
document.documentElement.lang = currentLang;
document.documentElement.dir = currentConfig.dir;

export default i18n;
