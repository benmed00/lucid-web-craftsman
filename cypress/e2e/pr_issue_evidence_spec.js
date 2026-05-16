/**
 * Captures viewport screenshots for enterprise tracking issues (#36–#44).
 * Prerequisites: mock API (3001) + Vite (8080 or VITE_DEV_SERVER_PORT).
 *
 * Run:
 *   pnpm exec start-server-and-test "pnpm run start:api" http-get://localhost:3001 "pnpm run dev:e2e" http-get://127.0.0.1:8080/contact "pnpm exec cypress run --spec cypress/e2e/pr_issue_evidence_spec.js"
 *
 * Artifacts: cypress/screenshots/pr_issue_evidence_spec.js/ — copy to docs/pr-enterprise/assets/issues/ via pnpm run pr:enterprise:screenshots
 */

const ASSET_PREFIX = 'issue-evidence';

function visitProductsCatalogReady() {
  cy.visit('/products');
  cy.get('body').should('be.visible');
  cy.get('[data-testid="products-catalog"] [id^="add-to-cart-btn-"]', {
    timeout: 25000,
  }).should('have.length.at.least', 1);
}

describe('PR issue evidence screenshots @regression', () => {
  beforeEach(() => {
    cy.stubCheckoutIntercepts();
    cy.stubProductsCatalog();
  });

  it('issue-39-44: checkout customer step', () => {
    visitProductsCatalogReady();
    cy.addCatalogLineAndOpenCheckoutStep1();
    cy.get('[data-testid="checkout-page-main"]').should('be.visible');
    cy.screenshot(`${ASSET_PREFIX}/44-checkout-step1-customer`, {
      capture: 'viewport',
    });
  });

  it('issue-39-44: checkout payment step', () => {
    visitProductsCatalogReady();
    cy.addCatalogLineAndOpenCheckoutStep1();
    cy.get('#firstName').clear().type('Jean');
    cy.get('#lastName').clear().type('Dupont');
    cy.get('#email').clear().type('jean.dupont@test.com');
    cy.get('fieldset')
      .find('button')
      .contains(/livraison|shipping|suivant|next|continuer/i)
      .click();
    cy.get('#address', { timeout: 15000 }).should('be.visible');
    cy.get('#address').type('12 Rue de la Paix');
    cy.get('#postalCode').type('75001');
    cy.get('#city').type('Paris');
    cy.get('[data-testid="checkout-continue-to-payment"]').filter(':visible').click();
    cy.contains(/visa|mastercard|paiement sécurisé|secure payment/i, {
      timeout: 15000,
    }).should('be.visible');
    cy.screenshot(`${ASSET_PREFIX}/44-checkout-step3-payment`, {
      capture: 'viewport',
    });
  });

  it('issue-39: footer SPA navigation marker', () => {
    cy.visit('/');
    cy.get('#main-content', { timeout: 20000 }).should('exist');
    cy.get('footer', { timeout: 20000 }).should('be.visible');
    cy.screenshot(`${ASSET_PREFIX}/39-footer-index`, { capture: 'viewport' });
    cy.window().then((win) => {
      win.__cypress_internal_link_spa__ = true;
    });
    cy.get('footer a[href="/products"]').filter(':visible').first().click();
    cy.url().should('include', '/products');
    cy.window().its('__cypress_internal_link_spa__').should('eq', true);
    cy.screenshot(`${ASSET_PREFIX}/39-footer-spa-products`, {
      capture: 'viewport',
    });
  });

  it('issue-43: products catalog (LCP path)', () => {
    cy.visit('/products');
    cy.get('[data-testid="products-catalog"]', { timeout: 25000 }).should(
      'be.visible'
    );
    cy.screenshot(`${ASSET_PREFIX}/43-products-catalog`, {
      capture: 'viewport',
    });
  });

  it('issue-39: cart before SPA checkout navigation', () => {
    visitProductsCatalogReady();
    cy.addCatalogLineAndOpenCartSpa();
    cy.screenshot(`${ASSET_PREFIX}/39-cart-with-line`, {
      capture: 'viewport',
    });
  });

  it('issue-36: contact page (E2E smoke probe route)', () => {
    cy.visit('/contact');
    cy.get('main', { timeout: 20000 }).should('be.visible');
    cy.screenshot(`${ASSET_PREFIX}/36-contact-smoke-probe`, {
      capture: 'viewport',
    });
  });

  it('issue-37-41: admin products list shell (public catalog)', () => {
    cy.visit('/products');
    cy.get('[data-testid="products-catalog"]', { timeout: 25000 }).should(
      'be.visible'
    );
    cy.screenshot(`${ASSET_PREFIX}/37-products-eslint-typed-catalog`, {
      capture: 'viewport',
    });
  });
});
