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
const repairedCount = validateAndSanitizeStorage();

// If this is a watchdog-triggered reload, log it
if (wasWatchdogReload()) {
  console.info('[StorageGuard] This page load was triggered by the hydration watchdog');
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
import { initializeBusinessRules } from '@/hooks/useBusinessRules';

// Declare global flag
declare global {
  interface Window {
    __PERF_OPTIMIZED__?: boolean;
  }
}

// Setup error suppression for production
setupProductionErrorSuppression();

// Diagnostic: Test Supabase connectivity early
{
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = import.meta.env
    .VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    console.error(
      '[Diagnostic] Supabase connectivity test skipped: missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY'
    );
  } else {
    const testController = new AbortController();
    const testTimeout = setTimeout(() => testController.abort(), 5000);
    console.info('[Diagnostic] Testing Supabase connectivity…');
    fetch(`${SUPABASE_URL}/rest/v1/products?select=id&limit=1`, {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      },
      signal: testController.signal,
    })
      .then((r) => {
        clearTimeout(testTimeout);
        console.info(
          `[Diagnostic] Supabase connectivity: ${r.status} ${r.ok ? '✅' : '❌'}`
        );
        return r
          .text()
          .then((t) =>
            console.info(
              `[Diagnostic] Response preview: ${t.substring(0, 200)}`
            )
          );
      })
      .catch((err) => {
        clearTimeout(testTimeout);
        console.error(
          `[Diagnostic] Supabase connectivity FAILED:`,
          err?.message || err
        );
      });
  }
}

// ============= 3. Deterministic store initialization =============
// Order: Theme → Language → Currency → Cart (theme first to avoid FOUC)
if (!window.__PERF_OPTIMIZED__) {
  window.__PERF_OPTIMIZED__ = true;

  initializeThemeStore();
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
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>
);
