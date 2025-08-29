import React, { StrictMode } from "react";
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.tsx';
import './index.css';
import { initPerformanceOptimizations } from '@/utils/sitemapGenerator';

// Declare global flag
declare global {
  interface Window {
    __PERF_OPTIMIZED__?: boolean;
  }
}

console.log('main.tsx loaded - cache cleared');
console.log('React available:', !!React);

// Initialize performance optimizations only once
if (!window.__PERF_OPTIMIZED__) {
  window.__PERF_OPTIMIZED__ = true;
  initPerformanceOptimizations();
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>
);
