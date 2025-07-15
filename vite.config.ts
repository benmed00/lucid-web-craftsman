// File_name: vite.config.ts

/// <reference types="vitest" />
import { componentTagger } from "lovable-tagger";
import { defineConfig as defineViteConfig } from "vite"; // Renamed for clarity
import path from "path";
import react from "@vitejs/plugin-react-swc";
// No separate import for defineVitestConfig needed if using reference types + inline
// import { defineConfig as defineVitestConfig } from 'vitest/config'; // Vitest config types

// https://vitejs.dev/config/
export default defineViteConfig(({ mode }) => ({
  base: "/lucid-web-craftsman/", // Remplace par le nom de ton repo GitHub
  server: {
    host: "127.0.0.1", // Changed to force IPv4
    port: 5173,       // Changed to a common Vite port
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
  // Vitest configuration
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts', // Path to setup file
    // You can add more Vitest options here if needed
    // e.g., coverage: { reporter: ['text', 'json', 'html'] }
  },
}));
