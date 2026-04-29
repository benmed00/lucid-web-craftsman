/** Single source for Cypress / start-server-and-test SPA probe (IPv4 loopback). */
export const E2E_HOST = '127.0.0.1';
export const E2E_PORT = 8080;
export const E2E_PROBE_URL = `http://${E2E_HOST}:${E2E_PORT}/contact`;
