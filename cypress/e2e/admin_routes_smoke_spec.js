/**
 * Admin: every protected /admin/* path redirects to login when unauthenticated.
 * Optional: when ADMIN_EMAIL / ADMIN_PASSWORD are set, smoke each route while logged in.
 *
 * Tags: @smoke @regression
 */

/** Paths under AdminLayout (see App.tsx + AdminLayout nav). */
const ADMIN_PROTECTED_PATHS = [
  '/admin',
  '/admin/dashboard',
  '/admin/products',
  '/admin/catalog',
  '/admin/blog',
  '/admin/hero-image',
  '/admin/inventory',
  '/admin/orders',
  '/admin/orders-enhanced',
  '/admin/customers',
  '/admin/marketing',
  '/admin/promo-codes',
  '/admin/analytics',
  '/admin/reviews',
  '/admin/translations',
  '/admin/tags',
  '/admin/error-reports',
  '/admin/newsletter',
  '/admin/email-testing',
  '/admin/api-status',
  '/admin/settings',
];

describe('Admin routes — unauthenticated redirect @smoke @regression', () => {
  it('redirects each protected path to /admin/login', () => {
    ADMIN_PROTECTED_PATHS.forEach((path) => {
      cy.clearCookies();
      cy.clearLocalStorage();
      cy.visit(path);
      cy.url({ timeout: 25000 }).should('include', '/admin/login');
    });
  });
});

describe('Admin routes — authenticated smoke @regression', () => {
  before(function () {
    if (!Cypress.env('ADMIN_EMAIL') || !Cypress.env('ADMIN_PASSWORD')) {
      cy.log(
        'Skipping admin route smoke: set ADMIN_EMAIL / ADMIN_PASSWORD (see cypress.env.example.json)'
      );
      this.skip();
    }
  });

  it('loads every admin menu path without redirect to login', () => {
    cy.loginAs('admin');
    ADMIN_PROTECTED_PATHS.forEach((path) => {
      cy.visit(path);
      cy.url({ timeout: 25000 }).should('not.include', '/admin/login');
      cy.get('main', { timeout: 30000 }).should('be.visible');
      cy.contains('Administration', { timeout: 30000 }).should('be.visible');
    });
  });
});
