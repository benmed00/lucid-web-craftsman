/**
 * Focused route smoke tests: admin shell + product comparison empty state.
 * Tags: @regression
 */

describe('Admin routes @regression', () => {
  it('redirects unauthenticated /admin to /admin/login', () => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.visit('/admin');
    cy.url({ timeout: 15000 }).should('include', '/admin/login');
  });

  it('renders the admin login form', () => {
    cy.visit('/admin/login');
    cy.contains('Administration', { timeout: 10000 }).should('be.visible');
    cy.get('#email').should('be.visible');
    cy.get('#password').should('be.visible');
    cy.get('button[type="submit"]').should('be.visible');
  });
});

describe('Compare page @regression', () => {
  it('shows empty compare state when no products selected', () => {
    cy.visit('/compare');
    cy.get('body').should('be.visible');
    cy.contains(/Aucun produit à comparer|aucun produit|compare|comparer/i, {
      timeout: 10000,
    }).should('be.visible');
    cy.get('a[href="/products"], a[href*="/products"]').first().should('exist');
  });
});
