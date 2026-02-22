// File_name: vite.config.ts
/// <reference types="vitest" />

import { defineConfig } from "vite";
import type { PreRenderedAsset } from "rollup";
import path from "path";
import react from "@vitejs/plugin-react-swc";

// Load lovable-tagger at config load (ESM-only; dynamic import required)
let componentTaggerPlugin: ReturnType<typeof import("lovable-tagger")["componentTagger"]> | null = null;
try {
  const { componentTagger } = await import("lovable-tagger");
  componentTaggerPlugin = componentTagger();
} catch {
  // lovable-tagger may be unavailable
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "/", // Fixed for Lovable preview environment
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api": { target: "http://localhost:3001", changeOrigin: true },
      "/health": { target: "http://localhost:3001", changeOrigin: true },
    },
    headers: {
      // Security headers for development - no X-Frame-Options to allow Lovable preview
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    },
  },
  preview: {
    headers: {
      // Security headers for preview builds - no X-Frame-Options to allow Lovable preview
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    },
  },
  plugins: [
    react(),
    mode === 'development' && componentTaggerPlugin,
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Dedupe React to prevent multiple instances
    dedupe: ['react', 'react-dom', 'react-i18next', 'i18next'],
  },
  optimizeDeps: {
    // Pre-bundle these dependencies to ensure single instance
    include: ['react', 'react-dom', 'react-i18next', 'i18next'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setupTests.ts',
    css: true,
  },
  build: {
    sourcemap: true, // Enable source maps for production builds
    cssCodeSplit: true, // Enable CSS code splitting for better caching
    rollupOptions: {
      output: {
        // Optimize chunk names for better caching
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