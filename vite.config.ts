// File_name: vite.config.ts

import { componentTagger } from "lovable-tagger";
import { defineConfig } from "vite";
import path from "path";
import react from "@vitejs/plugin-react-swc";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "/", // Fixed for Lovable preview environment
  server: {
    host: "::",
    port: 8080,
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
    sourcemap: true, // Enable source maps for production builds
    rollupOptions: {
      output: {
        // Ensure source maps are generated for all chunks
        sourcemap: true,
        sourcemapExcludeSources: false,
      },
    },
  },
}));
