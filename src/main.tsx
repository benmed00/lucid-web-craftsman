import { StrictMode, useEffect, useState } from "react";
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { I18nextProvider } from 'react-i18next';
import { initReactI18next } from 'react-i18next';
import './index.css';

// Import i18n instance (no React binding at module level)
import i18n from './i18n';

// Import performance utilities and store initializers
import { initPerformanceOptimizations } from '@/utils/sitemapGenerator';
import { setupProductionErrorSuppression } from './utils/errorSuppression';
import { registerServiceWorker, addResourceHints, monitorCachePerformance } from './utils/cacheOptimization';
import { initializeCartStore, initializeCurrencyStore, initializeThemeStore } from '@/stores';
import { initializeLanguageStore } from '@/stores/languageStore';
import { initializeBusinessRules } from '@/hooks/useBusinessRules';

// Import App
import App from './App';

// Declare global flag
declare global {
  interface Window {
    __PERF_OPTIMIZED__?: boolean;
    __I18N_REACT_BOUND__?: boolean;
  }
}

// Setup error suppression for production
setupProductionErrorSuppression();

// Initialize performance optimizations only once
if (!window.__PERF_OPTIMIZED__) {
  window.__PERF_OPTIMIZED__ = true;
  initPerformanceOptimizations();
  
  // Initialize cache optimizations for SEO performance
  addResourceHints();
  registerServiceWorker();
  monitorCachePerformance();
  
  // Initialize business rules first (async, non-blocking)
  initializeBusinessRules().catch(console.warn);
  
  // Initialize Zustand stores
  initializeCartStore();
  initializeCurrencyStore();
  initializeThemeStore();
  initializeLanguageStore();
}

// Bind i18n to React once (inside React context)
if (!window.__I18N_REACT_BOUND__) {
  window.__I18N_REACT_BOUND__ = true;
  i18n.use(initReactI18next);
}

// Root component that initializes i18n within React context
const Root = () => {
  return (
    <StrictMode>
      <HelmetProvider>
        <I18nextProvider i18n={i18n}>
          <App />
        </I18nextProvider>
      </HelmetProvider>
    </StrictMode>
  );
};

createRoot(document.getElementById("root")!).render(<Root />);
