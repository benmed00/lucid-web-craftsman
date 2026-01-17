import React, { StrictMode } from "react";
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import './index.css';
import { initPerformanceOptimizations } from '@/utils/sitemapGenerator';
import { setupProductionErrorSuppression } from './utils/errorSuppression';
import { registerServiceWorker, addResourceHints, monitorCachePerformance } from './utils/cacheOptimization';
import { initializeCartStore, initializeCurrencyStore, initializeThemeStore } from '@/stores';
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

// Import i18n after stores are initialized
import './i18n';

// Import App after i18n is ready
import App from './App.tsx';

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>
);
