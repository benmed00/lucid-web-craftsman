// Force fresh React import to bypass Vite cache
import * as React from "react";
import { StrictMode } from "react";
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Force fresh imports with timestamp
console.log('🚀 main-clean.tsx loaded at:', new Date().toISOString());
console.log('✅ React available:', !!React);
console.log('✅ createRoot available:', !!createRoot);

const rootElement = document.getElementById("root");
console.log('✅ Root element found:', !!rootElement);

if (rootElement) {
  const root = createRoot(rootElement);
  console.log('✅ Root created successfully');
  
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
  console.log('✅ App rendered successfully');
} else {
  console.error('❌ Root element not found!');
}