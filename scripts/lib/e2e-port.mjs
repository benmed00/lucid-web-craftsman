/**
 * Single source for Vite dev port + Cypress / start-server-and-test SPA probe (IPv4 loopback).
 * Must stay aligned with vite.config.ts (`server.port`) and cypress.config.ts default `baseUrl`.
 *
 * @see https://vitejs.dev/config/server-options.html#server-port
 *
 * Env: `VITE_DEV_SERVER_PORT` — optional; default **8080**. Use when port 8080 is taken locally
 * (e.g. Apache PEMHTTPD on Windows).
 */
export const E2E_HOST = '127.0.0.1';
export const E2E_PORT = Number.parseInt(
  process.env.VITE_DEV_SERVER_PORT ?? '8080',
  10
);
export const E2E_PROBE_URL = `http://${E2E_HOST}:${E2E_PORT}/contact`;
