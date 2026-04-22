/**
 * Vite configuration
 *
 * Build tool for React (SWC), Vitest, and dev server.
 * - base: '/' (Lovable preview compatible)
 * - Dev server: port 8080, proxies /api and /health to json-server (3001);
 *   /frankfurter-api → api.frankfurter.dev (no browser CORS on the public API)
 * - Test: jsdom, globals, setupTests.ts
 *
 * E2E port contract (keep in sync with cypress.config.ts baseUrl + package.json e2e:*):
 * start-server-and-test waits on http://localhost:8080/contact (SPA route) so a stray
 * listener on 8080 that only serves `/` does not look “ready”. Cypress baseUrl stays :8080. The dev server uses
 * strictPort so we never silently bind to 8081/8082 when 8080 is taken (that mismatch
 * caused cy.visit ECONNREFUSED). Override the app origin with CYPRESS_BASE_URL if needed.
 *
 * @see https://vitejs.dev/config/
 */

/// <reference types="vitest" />
import { defineConfig } from 'vite';
import type { PreRenderedAsset } from 'rollup';
import { readFileSync } from 'fs';
import path from 'path';
import react from '@vitejs/plugin-react-swc';

const pkgVersion = JSON.parse(
  readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8')
).version as string;

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

  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(
      process.env.VITE_APP_VERSION ?? pkgVersion
    ),
  },

  // ==========================================================================
  // Dev server — must stay on 8080 for Cypress (see file header: E2E port contract)
  // ==========================================================================
  server: {
    host: '::',
    port: 8080,
    // Fail if 8080 is taken (don’t silently use 8082 — Cypress baseUrl stays :8080)
    strictPort: true,
    proxy: {
      '/frankfurter-api': {
        target: 'https://api.frankfurter.dev',
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/frankfurter-api/, ''),
      },
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
    proxy: {
      '/frankfurter-api': {
        target: 'https://api.frankfurter.dev',
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/frankfurter-api/, ''),
      },
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
    // Do not set `test.api` here: a fixed port makes `vitest run` fail when 24678 is
    // taken (e.g. `npm run test:ui`). UI uses loopback + 24678 via `test:ui` in package.json.
  },

  // ==========================================================================
  // Production build
  // ==========================================================================
  build: {
    sourcemap: true,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-router': ['react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-i18n': [
            'i18next',
            'react-i18next',
            'i18next-browser-languagedetector',
          ],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
          ],
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'vendor-charts': ['recharts'],
        },
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
