import React, { StrictMode } from "react";
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

console.log('main.tsx loaded - cache cleared');
console.log('React available:', !!React);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
