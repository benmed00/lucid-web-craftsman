import React, { StrictMode } from "react";
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.tsx';
import './index.css';
import { initPerformanceOptimizations } from '@/utils/sitemapGenerator';
import { setupProductionErrorSuppression } from './utils/errorSuppression';
import { registerServiceWorker, addResourceHints, monitorCachePerformance } from './utils/cacheOptimization';
import { initializeCartStore, initializeWishlistStore, initializeCurrencyStore } from '@/stores';

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
  
  // Initialize Zustand stores
  initializeCartStore();
  initializeCurrencyStore();
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>
);
