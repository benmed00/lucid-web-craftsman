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

// Diagnostic: Test Supabase connectivity early
// This helps identify if the network layer is working
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

// ============= Safe localStorage validation =============
// Validate persisted Zustand stores before initialization.
// Corrupted JSON will crash store hydration and break the entire app.
{
  const PERSISTED_STORES = [
    'cart-storage',
    'currency-storage',
    'rif-raw-straw-theme',
    'language-storage',
  ];
  for (const key of PERSISTED_STORES) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Zustand persist format: { state: {...}, version: number }
        if (!parsed || typeof parsed !== 'object' || !('state' in parsed)) {
          console.warn(`[StorageGuard] Invalid format for "${key}", clearing`);
          localStorage.removeItem(key);
        }
      }
    } catch {
      console.warn(`[StorageGuard] Corrupted JSON in "${key}", clearing`);
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    }
  }

  // Also validate hero image cache (not a Zustand store but causes issues)
  try {
    const heroCache = localStorage.getItem('rif_hero_image_cache');
    if (heroCache) {
      const parsed = JSON.parse(heroCache);
      if (!parsed || !parsed.imageUrl || !parsed.title) {
        console.warn('[StorageGuard] Invalid hero cache, clearing');
        localStorage.removeItem('rif_hero_image_cache');
      }
    }
  } catch {
    console.warn('[StorageGuard] Corrupted hero cache, clearing');
    try {
      localStorage.removeItem('rif_hero_image_cache');
    } catch {
      /* ignore */
    }
  }
}

// Initialize only critical stores before render
if (!window.__PERF_OPTIMIZED__) {
  window.__PERF_OPTIMIZED__ = true;

  // Initialize Zustand stores (synchronous, lightweight)
  initializeCartStore();
  initializeCurrencyStore();
  initializeThemeStore();
  initializeLanguageStore();

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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>
);
