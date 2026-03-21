/**
 * Cypress E2E configuration
 *
 * Uses @cypress/grep for tagged specs: @smoke (critical path), @regression (full suite).
 * All specs live under cypress/e2e/ (TypeScript or JavaScript).
 *
 * @see https://docs.cypress.io/guides/references/configuration
 * @see https://github.com/cypress-io/cypress-grep
 */

import { defineConfig } from 'cypress';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export default defineConfig({
  // allowCypressEnv must stay true: @cypress/grep uses Cypress.env('grep') internally
  // Avoid "failed to trash" on Windows when clearing screenshots/videos
  trashAssetsBeforeRuns: false,
  e2e: {
    specPattern: 'cypress/e2e/**/*.{js,ts}',

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
      grepFilterSpecs: true,
      grepOmitFiltered: true, // When grep used, omit non-matching specs
    },

    setupNodeEvents(on, config) {
      // CI: GitHub Actions can pass CYPRESS_ADMIN_* / CYPRESS_CUSTOMER_* repo secrets;
      // merge into Cypress.env() so specs keep using ADMIN_EMAIL, CUSTOMER_EMAIL, etc.
      const mergeFromProcess = (key: string, value: string | undefined) => {
        if (value !== undefined && value !== '') {
          (config.env as Record<string, string>)[key] = value;
        }
      };
      mergeFromProcess('ADMIN_EMAIL', process.env.CYPRESS_ADMIN_EMAIL);
      mergeFromProcess('ADMIN_PASSWORD', process.env.CYPRESS_ADMIN_PASSWORD);
      mergeFromProcess('CUSTOMER_EMAIL', process.env.CYPRESS_CUSTOMER_EMAIL);
      mergeFromProcess('CUSTOMER_PASSWORD', process.env.CYPRESS_CUSTOMER_PASSWORD);

      const { plugin: grepPlugin } = require('@cypress/grep/plugin');
      grepPlugin(config);
      return config;
    },
  },
});
