import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import './index.css';

// ============= 1. Storage self-healing (MUST run before anything else) =============
import {
  validateAndSanitizeStorage,
  startHydrationWatchdog,
  wasWatchdogReload,
} from '@/lib/storage/StorageGuard';

// Validate all persisted stores SYNCHRONOUSLY before any store initializes
void validateAndSanitizeStorage();

// If this is a watchdog-triggered reload, log it
if (wasWatchdogReload()) {
  console.info(
    '[StorageGuard] This page load was triggered by the hydration watchdog'
  );
}

// Start the hydration watchdog — if App doesn't resolve within 4s, purge & reload
// Skip if we already did a watchdog reload (prevent infinite loop)
if (!wasWatchdogReload()) {
  startHydrationWatchdog(4000);
}

// ============= 2. i18n initialization =============
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
import { initializeUIStyleStore } from '@/stores/uiStyleStore';
import { initializeBusinessRules } from '@/hooks/useBusinessRules';

// Declare global flag
declare global {
  interface Window {
    __PERF_OPTIMIZED__?: boolean;
  }
}

// Setup error suppression for production
setupProductionErrorSuppression();
// NOTE: Diagnostic Supabase connectivity test was removed — 
// the actual product query serves as the connectivity check.

// ============= 3. Deterministic store initialization =============
// Order: Theme → Language → Currency → Cart (theme first to avoid FOUC)
if (!window.__PERF_OPTIMIZED__) {
  window.__PERF_OPTIMIZED__ = true;

  initializeThemeStore();
  initializeUIStyleStore();
  initializeLanguageStore();
  initializeCurrencyStore();
  initializeCartStore();

  // Defer ALL non-critical initializations to after first paint
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      initPerformanceOptimizations();
      addResourceHints();
      setTimeout(() => {
        registerServiceWorker();
        initializeBusinessRules().catch(console.warn);
      }, 2000);
    });
  });
}

// ============= 4. Render =============
if (!(window as any).__LOVABLE_LOGOUT) {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </StrictMode>
  );
}
