/**
 * Internal routes switched from <a href> to React Router <Link> — SPA navigation
 * regression suite. Each case sets a window marker; a full document reload would
 * clear it and fail the assertion.
 *
 * Covers: Footer (Index), FAQ returns link, newsletter privacy to terms-of-service,
 * PaymentSuccess error to contact, /orders empty CTA, enhanced-profile orders tab CTA.
 *
 * Prerequisites: mock API 3001 + Vite (default 8080). Wrong listener on 8080:
 * use VITE_DEV_SERVER_PORT + CYPRESS_BASE_URL (see AGENTS.md / cypress README).
 *
 * Run (CI parity):
 *   pnpm exec start-server-and-test "pnpm run start:api" http-get://localhost:3001 "pnpm run dev:e2e" http-get://127.0.0.1:8080/contact "pnpm exec cypress run --spec cypress/e2e/internal_links_spa_spec.js"
 *
 * Customer-only tests use this.skip() when CUSTOMER_EMAIL / CUSTOMER_PASSWORD unset.
 *
 * Mocks: intercept GET rest/v1/orders with body [] for empty-order CTAs (auth tests).
 */

const SPA_MARKER = '__cypress_internal_link_spa__';

function requireCustomerCreds() {
  const email = Cypress.env('CUSTOMER_EMAIL');
  const password = Cypress.env('CUSTOMER_PASSWORD');
  return Boolean(email && password);
}

/** Set marker, click first visible match, assert URL fragments and SPA marker. */
function assertSpaClick(selector, urlChecks) {
  cy.window().then((win) => {
    win[SPA_MARKER] = true;
  });
  cy.get(selector).filter(':visible').first().scrollIntoView().click();
  urlChecks.forEach((frag) => cy.url().should('include', frag));
  cy.window().its(SPA_MARKER).should('eq', true);
}

describe('Internal Link SPA navigation @regression', () => {
  describe('Footer (src/components/Footer.tsx) on /', () => {
    const footerCases = [
      { href: '/products', url: ['/products'] },
      { href: '/products?category=Sacs', url: ['/products', 'category=Sacs'] },
      {
        href: '/products?category=Chapeaux',
        url: ['/products', 'category=Chapeaux'],
      },
      { href: '/about', url: ['/about'] },
      { href: '/blog', url: ['/blog'] },
      { href: '/contact', url: ['/contact'] },
      { href: '/shipping', url: ['/shipping'] },
      { href: '/returns', url: ['/returns'] },
      { href: '/faq', url: ['/faq'] },
      { href: '/cgv', url: ['/cgv'] },
      { href: '/terms-of-service', url: ['/terms-of-service'] },
    ];

    footerCases.forEach(({ href, url }) => {
      it(`footer Link SPA: ${href}`, () => {
        cy.visit('/');
        cy.get('#main-content', { timeout: 20000 }).should('exist');
        cy.get('footer', { timeout: 20000 }).should('be.visible');
        assertSpaClick(`footer a[href="${href}"]`, url);
      });
    });
  });

  it('FAQ → /returns (main content link)', () => {
    cy.visit('/faq');
    cy.get('main', { timeout: 20000 }).should('be.visible');
    assertSpaClick('main a[href="/returns"]', ['/returns']);
  });

  it('Newsletter consent → /terms-of-service (Index inline block)', () => {
    cy.visit('/');
    cy.get('#main-content', { timeout: 20000 }).should('exist');
    cy.get('label[for="newsletter-consent"]', { timeout: 20000 }).should(
      'be.visible'
    );
    assertSpaClick(
      'label[for="newsletter-consent"] a[href="/terms-of-service"]',
      ['/terms-of-service']
    );
  });

  it('PaymentSuccess error state → /contact', () => {
    cy.visit('/payment-success');
    cy.contains(/couldn't find|ne trouvons pas|find your order/i, {
      timeout: 15000,
    }).should('be.visible');
    assertSpaClick('div.max-w-md a[href="/contact"]', ['/contact']);
  });

  describe('Order empty-state CTAs → /products (customer session)', () => {
    beforeEach(function () {
      if (!requireCustomerCreds()) {
        this.skip();
      }
      cy.intercept('GET', '**/rest/v1/orders*', {
        statusCode: 200,
        body: [],
      }).as('emptyOrders');
      cy.loginAs('customer');
    });

    it('/orders page empty CTA', () => {
      cy.visit('/orders');
      cy.wait('@emptyOrders', { timeout: 20000 });
      cy.contains('h3', /No orders yet|Aucune commande/i, {
        timeout: 15000,
      }).should('be.visible');
      cy.window().then((win) => {
        win[SPA_MARKER] = true;
      });
      cy.contains('h3', /No orders yet|Aucune commande/i)
        .parent()
        .find('a[href="/products"]')
        .first()
        .scrollIntoView()
        .click();
      cy.url().should('include', '/products');
      cy.window().its(SPA_MARKER).should('eq', true);
    });

    it('Enhanced profile orders tab empty CTA', () => {
      cy.visit('/enhanced-profile#orders');
      cy.wait('@emptyOrders', { timeout: 20000 });
      // profile OrderHistory empty title is hardcoded FR in component
      cy.contains('h3', /Aucune commande|No orders yet/i, {
        timeout: 15000,
      }).should('be.visible');
      cy.window().then((win) => {
        win[SPA_MARKER] = true;
      });
      cy.contains('h3', /Aucune commande|No orders yet/i)
        .parent()
        .find('a[href="/products"]')
        .first()
        .scrollIntoView()
        .click();
      cy.url().should('include', '/products');
      cy.window().its(SPA_MARKER).should('eq', true);
    });
  });
});
