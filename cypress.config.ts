/**
 * Cypress E2E configuration
 *
 * Uses @cypress/grep for tagged specs: @smoke (critical path), @regression (full suite).
 * specPattern includes both cypress/integration and cypress/e2e (checkout flow).
 *
 * @see https://docs.cypress.io/guides/references/configuration
 * @see https://github.com/cypress-io/cypress-grep
 */

import { defineConfig } from 'cypress';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export default defineConfig({
  e2e: {
    // Specs from integration (header, mobile, nav) and e2e (checkout)
    specPattern: 'cypress/{integration,e2e}/**/*.{js,ts}',

    supportFile: 'cypress/support/index.ts',

    // App URL (dev server default; override with CYPRESS_BASE_URL)
    baseUrl: process.env.CYPRESS_BASE_URL ?? 'http://localhost:8080',

    viewportWidth: 1280,
    viewportHeight: 720,

    defaultCommandTimeout: 10_000,
    requestTimeout: 20_000,
    responseTimeout: 30_000,

    retries: { runMode: 1, openMode: 0 },
    video: false,
    screenshotOnRunFailure: true,

    env: {
      grepFilterSpecs: false,
      grepOmitFiltered: true, // When grep used, omit non-matching specs
    },

    setupNodeEvents(on, config) {
      const { plugin: grepPlugin } = require('@cypress/grep/plugin');
      grepPlugin(config);
      return config;
    },
  },
});
