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
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://xcvlijchkmhjonhfildm.supabase.co';
  const testController = new AbortController();
  const testTimeout = setTimeout(() => testController.abort(), 5000);
  console.info('[Diagnostic] Testing Supabase connectivity…');
  fetch(`${SUPABASE_URL}/rest/v1/products?select=id&limit=1`, {
    headers: {
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjdmxpamNoa21oam9uaGZpbGRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2MDY3MDEsImV4cCI6MjA2MzE4MjcwMX0.3_FZWbV4qCqs1xQmh0Hws83xQxofSApzVRScSCEi9Pg',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjdmxpamNoa21oam9uaGZpbGRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2MDY3MDEsImV4cCI6MjA2MzE4MjcwMX0.3_FZWbV4qCqs1xQmh0Hws83xQxofSApzVRScSCEi9Pg'}`,
    },
    signal: testController.signal,
  })
    .then((r) => {
      clearTimeout(testTimeout);
      console.info(`[Diagnostic] Supabase connectivity: ${r.status} ${r.ok ? '✅' : '❌'}`);
      return r.text().then((t) => console.info(`[Diagnostic] Response preview: ${t.substring(0, 200)}`));
    })
    .catch((err) => {
      clearTimeout(testTimeout);
      console.error(`[Diagnostic] Supabase connectivity FAILED:`, err?.message || err);
    });
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
