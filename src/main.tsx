import { createRoot } from 'react-dom/client'
// import App from './App.tsx'
import './index.css'

// In main.tsx, implement lazy loading
import { Suspense } from 'react';
import React from 'react';

const App = React.lazy(() => import('./App'));

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Suspense fallback={<div>Loading...</div>}>
      <App />
    </Suspense>
  </React.StrictMode>
);