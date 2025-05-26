// File_name: vite.config.ts

import { componentTagger } from "lovable-tagger";
import { defineConfig } from "vite";
import path from "path";
import react from "@vitejs/plugin-react-swc";

// Lit la variable BASE_PATH définie dans GitHub Actions
const basePath = process.env.BASE_PATH ?? '/';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? process.env.VITE_BASE_PATH || '/' : '/',
  assetsInclude: ['**/*.jpg', '**/*.png', '**/*.webp'],
  server: {
    // host: "::",
    // port: 8080,
    // proxy: {
    //   '/assets': {
    //     target: 'http://localhost:8080',
    //     changeOrigin: true
    //   }
    // }
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    target: 'esnext',
    outDir: 'dist',
    assetsDir: 'assets', // Add this
    emptyOutDir: true,
    rollupOptions: {
      output: {
        input: {
          main: path.resolve(__dirname, 'index.html')
        },
        manualChunks: {
          vendor: ['react', 'react-dom', '@tanstack/react-query']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['@radix-ui/react-slot', '@tanstack/react-query']
  }
}));
