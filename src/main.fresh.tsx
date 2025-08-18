import React from 'react';
import { createRoot } from 'react-dom/client';
import FreshApp from './App.fresh.tsx';

console.log('main.fresh.tsx loading');
console.log('React available:', !!React);
console.log('createRoot available:', !!createRoot);

const rootElement = document.getElementById('root-fresh');
if (!rootElement) {
  console.error('Root element #root-fresh not found!');
} else {
  console.log('Found root element, creating React app...');
  const root = createRoot(rootElement);
  
  try {
    root.render(<FreshApp />);
    console.log('✅ Fresh React app rendered successfully');
  } catch (error) {
    console.error('❌ Error rendering fresh app:', error);
  }
}