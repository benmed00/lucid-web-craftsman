import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import './index.css';

// Import i18n FIRST to ensure it's initialized before any components
import './i18n';

// Import App after i18n is configured
import App from './App';

// Import performance utilities and store initializers
import { initPerformanceOptimizations } from '@/utils/sitemapGenerator';
import { setupProductionErrorSuppression } from './utils/errorSuppression';
import {
  registerServiceWorker,
  addResourceHints,
} from './utils/cacheOptimization';
import {
  initializeCartStore,
  initializeCurrencyStore,
  initializeThemeStore,
} from '@/stores';
import { initializeLanguageStore } from '@/stores/languageStore';
import { initializeBusinessRules } from '@/hooks/useBusinessRules';
// Declare global flag
declare global {
  interface Window {
    __PERF_OPTIMIZED__?: boolean;
  }
}

// Setup error suppression for production
setupProductionErrorSuppression();

// Initialize only critical stores before render
if (!window.__PERF_OPTIMIZED__) {
  window.__PERF_OPTIMIZED__ = true;

  // Initialize Zustand stores (synchronous, lightweight)
  initializeCartStore();
  initializeCurrencyStore();
  initializeThemeStore();
  initializeLanguageStore();

  // Defer ALL non-critical initializations to after first paint
  // Use double-rAF to ensure we're past the first frame
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      initPerformanceOptimizations();
      addResourceHints();
      // Defer service worker even further to avoid competing with main thread
      setTimeout(() => {
        registerServiceWorker();
        initializeBusinessRules().catch(console.warn);
      }, 2000);
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>
);
