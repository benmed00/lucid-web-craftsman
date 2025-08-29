import React, { StrictMode } from "react";
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.tsx';
import './index.css';
import { initPerformanceOptimizations } from '@/utils/sitemapGenerator';

console.log('main.tsx loaded - cache cleared');
console.log('React available:', !!React);

// Initialize performance optimizations
initPerformanceOptimizations();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>
);
