/**
 * Vite configuration
 *
 * Build tool for React (SWC), Vitest, and dev server.
 * - base: '/' (Lovable preview compatible)
 * - Dev server: port 8080, proxies /api and /health to json-server (3001)
 * - Test: jsdom, globals, setupTests.ts
 *
 * @see https://vitejs.dev/config/
 */

/// <reference types="vitest" />
import { defineConfig } from 'vite';
import type { PreRenderedAsset } from 'rollup';
import path from 'path';
import react from '@vitejs/plugin-react-swc';

// ==========================================================================
// Optional Lovable component tagger
// Load at config time; ESM-only, so dynamic import required
// ==========================================================================
let componentTaggerPlugin: ReturnType<
  (typeof import('lovable-tagger'))['componentTagger']
> | null = null;
try {
  const { componentTagger } = await import('lovable-tagger');
  componentTaggerPlugin = componentTagger();
} catch {
  // lovable-tagger may be unavailable in some environments
}

export default defineConfig(({ mode }) => ({
  base: '/',

  // ==========================================================================
  // Dev server
  // ==========================================================================
  server: {
    host: '::',
    port: 8080,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
      '/health': { target: 'http://localhost:3001', changeOrigin: true },
    },
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    },
  },

  preview: {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    },
  },

  // ==========================================================================
  // Plugins
  // ==========================================================================
  plugins: [react(), mode === 'development' && componentTaggerPlugin].filter(
    Boolean
  ),

  // ==========================================================================
  // Resolve & deps
  // ==========================================================================
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
    dedupe: ['react', 'react-dom', 'react-i18next', 'i18next'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-i18next', 'i18next'],
  },

  // ==========================================================================
  // Vitest (test runner)
  // ==========================================================================
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setupTests.ts',
    css: true,
  },

  // ==========================================================================
  // Production build
  // ==========================================================================
  build: {
    sourcemap: true,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo: PreRenderedAsset) => {
          const name = assetInfo.name || 'asset';
          const info = name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/css/i.test(ext)) {
            return `assets/css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
  },
}));
