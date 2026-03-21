/**
 * Admin dashboard — requires real admin Supabase user.
 * Set ADMIN_EMAIL / ADMIN_PASSWORD in cypress.env.json (see cypress.env.example.json).
 *
 * Tags: @regression
 */

describe('Admin dashboard (authenticated) @regression', () => {
  before(function () {
    if (!Cypress.env('ADMIN_EMAIL') || !Cypress.env('ADMIN_PASSWORD')) {
      cy.log('Skipping admin dashboard: ADMIN_EMAIL / ADMIN_PASSWORD not set');
      this.skip();
    }
  });

  beforeEach(() => {
    cy.loginAs('admin');
  });

  it('loads the admin dashboard', () => {
    cy.visit('/admin');
    cy.url({ timeout: 15000 }).should('include', '/admin');
    cy.contains('h1', 'Tableau de bord', { timeout: 25000 }).should('be.visible');
  });
});
