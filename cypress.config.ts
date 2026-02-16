import { defineConfig } from "cypress";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export default defineConfig({
  e2e: {
    specPattern: "cypress/integration/**/*.{js,ts}",
    supportFile: "cypress/support/index.ts",
    baseUrl: process.env.CYPRESS_BASE_URL ?? "http://localhost:8080",
    defaultCommandTimeout: 10_000,
    requestTimeout: 20_000,
    responseTimeout: 30_000,
    retries: { runMode: 1, openMode: 0 },
    env: {
      grepFilterSpecs: false,
      grepOmitFiltered: true
    },
    setupNodeEvents(on, config) {
      const { plugin: grepPlugin } = require("@cypress/grep/plugin");
      grepPlugin(config);
      return config;
    }
  }
});
