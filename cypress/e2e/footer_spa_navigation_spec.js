/**
 * Footer (src/components/Footer.tsx) — client-side navigation vs full document reload.
 *
 * Uses a property on `window`: if the browser did a full reload after click, the
 * property would be lost. React Router `Link` keeps the same document / JS realm.
 *
 * Prerequisites: mock API 3001 + Vite 8080 (same as other E2E). A bare
 * `cypress run` without servers → visit failures / 404.
 *
 * Run (CI parity — starts API + Vite on 8080):
 *   pnpm exec start-server-and-test "pnpm run start:api" http-get://localhost:3001 "pnpm run dev:e2e" http-get://127.0.0.1:8080/contact "pnpm exec cypress run --spec cypress/e2e/footer_spa_navigation_spec.js"
 * If **8080 is already taken** by another process (symptoms: `cy.visit('/cart')` → HTTP 404, or `#main-content` missing on `/`), start this app on a free port and point Cypress at it:
 *   cross-env VITE_E2E=1 VITE_DEV_SERVER_PORT=8081 pnpm exec vite
 *   (mock API on 3001 in another terminal: `pnpm run start:api`)
 *   CYPRESS_BASE_URL=http://127.0.0.1:8081 pnpm exec cypress run --spec cypress/e2e/footer_spa_navigation_spec.js
 * If stacks already up with correct SPA (probe: `http://127.0.0.1:<port>/contact` must be 200):
 *   pnpm exec cypress run --spec cypress/e2e/footer_spa_navigation_spec.js
 *
 * Mocks: none (footer links only).
 */

const SPA_MARKER = '__cypress_footer_spa_no_full_reload__';

describe('Footer SPA navigation (no full document reload) @regression', () => {
  it('from / keeps same JS realm when clicking footer → /products', () => {
    cy.visit('/');
    cy.get('#main-content', { timeout: 20000 }).should('exist');
    cy.get('footer', { timeout: 20000 }).should('be.visible');
    cy.window().then((win) => {
      win[SPA_MARKER] = true;
    });
    cy.get('footer a[href="/products"]')
      .filter(':visible')
      .first()
      .scrollIntoView()
      .click();
    cy.url().should('include', '/products');
    cy.window().its(SPA_MARKER).should('eq', true);
    cy.screenshot('footer-spa-index-to-products', { capture: 'viewport' });
  });

  it('from /cart keeps same JS realm when clicking footer → /contact', () => {
    cy.visit('/cart');
    cy.get('#main-content', { timeout: 20000 }).should('exist');
    cy.get('footer', { timeout: 20000 }).should('be.visible');
    cy.window().then((win) => {
      win[SPA_MARKER] = 'cart';
    });
    cy.get('footer a[href="/contact"]')
      .filter(':visible')
      .first()
      .scrollIntoView()
      .click();
    cy.url().should('include', '/contact');
    cy.window().its(SPA_MARKER).should('eq', 'cart');
    cy.screenshot('footer-spa-cart-to-contact', { capture: 'viewport' });
  });
});
