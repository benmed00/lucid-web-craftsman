import React, { StrictMode } from "react";
import { createRoot } from 'react-dom/client';
import App from './App.minimal.tsx';
import './index.css';

console.log('main.tsx loaded');
console.log('React from main.tsx:', React);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
