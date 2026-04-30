/**
 * Vite configuration
 *
 * Build tool for React (SWC), Vitest, and dev server.
 * - base: '/' (Lovable preview compatible)
 * - Dev + preview: proxies `/api` and `/health` to json-server (3001); dev port defaults 8080
 *   (`VITE_DEV_SERVER_PORT`). Start the mock API locally when using those paths.
 * - `/frankfurter-api` → api.frankfurter.dev (no browser CORS on the public API)
 * - Test: jsdom, globals, setupTests.ts
 *
 * E2E port contract (keep in sync with cypress.config.ts baseUrl + package.json e2e:*):
 * start-server-and-test waits on `http://127.0.0.1:<port>/contact` (SPA route; default port
 * **8080**) so a stray listener that only serves `/` does not look “ready”, and the probe
 * host matches Cypress baseUrl (loopback IPv4). `strictPort` fails fast if the requested port
 * is taken. Use **`VITE_DEV_SERVER_PORT`** (see `scripts/lib/e2e-port.mjs`) when 8080 is busy
 * (e.g. Apache); use **`CYPRESS_BASE_URL`** for preview/staging origins only.
 *
 * Dev `server.host` must bind IPv4 explicitly (`0.0.0.0`): with only `'::'` or some `true`
 * defaults, Node on Windows can listen on IPv6 while another process (e.g. Apache) holds
 * 0.0.0.0:8080 — then Vite prints “ready” but http://127.0.0.1:8080/* is still the other
 * server (404 on SPA paths). `0.0.0.0` competes for the same IPv4 port and fails fast if busy.
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

/** Keeps Cypress + start-server-and-test SPA probe aligned (see scripts/lib/e2e-port.mjs). */
const devServerPort = Number.parseInt(
  process.env.VITE_DEV_SERVER_PORT ?? '8080',
  10
);

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
  // Dev server — default port 8080; override with `VITE_DEV_SERVER_PORT` (must match Cypress)
  // ==========================================================================
  server: {
    host: '0.0.0.0',
    port: devServerPort,
    // Fail if the requested port is taken (don’t silently use 8082 — Cypress must match)
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
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
      '/health': { target: 'http://localhost:3001', changeOrigin: true },
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
    // taken (e.g. `pnpm run test:ui`). UI uses loopback + 24678 via `test:ui` in package.json.
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
