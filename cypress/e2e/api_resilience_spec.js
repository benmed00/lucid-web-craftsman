/**
 * Supabase / PostgREST error handling (mocked via cy.mockSupabaseResponse).
 * Uses the same URL globs as cypress/support/commands.ts.
 *
 * Tags: @regression
 */

describe('API Resilience — mocked Supabase errors @regression', () => {
  it('shows retry UI when products request returns 500', () => {
    cy.mockSupabaseResponse('GET', '/products', 'error500');
    cy.visit('/products');
    // Products.tsx error state: retry button (FR/EN) + destructive icon
    cy.contains('button', /retry|réessayer|Réessayer/i, {
      timeout: 25000,
    }).should('be.visible');
    cy.get('.text-destructive').should('exist');
  });

  it('shows retry UI when products request returns 400', () => {
    cy.mockSupabaseResponse('GET', '/products', 'error400');
    cy.visit('/products');
    cy.contains('button', /retry|réessayer|Réessayer/i, {
      timeout: 25000,
    }).should('be.visible');
  });

  it('shows retry UI when products request has network failure', () => {
    cy.mockSupabaseResponse('GET', '/products', 'errorTimeout');
    cy.visit('/products');
    cy.contains('button', /retry|réessayer|Réessayer/i, {
      timeout: 25000,
    }).should('be.visible');
  });

  it('eventually loads products after high-latency success', () => {
    cy.mockSupabaseResponse('GET', '/products', 'latency');
    cy.visit('/products');
    cy.get('[id^="product-card-"], [id^="add-to-cart-btn-"]', {
      timeout: 20000,
    }).should('exist');
  });

  it('redirects to auth when profiles request returns 401 on /profile', () => {
    cy.mockSupabaseResponse('GET', '/profiles', 'error401');
    cy.visit('/profile');
    cy.url({ timeout: 15000 }).should('include', '/auth');
  });

  it('shows error when orders request returns 403 (authenticated)', function () {
    if (!Cypress.env('CUSTOMER_EMAIL') || !Cypress.env('CUSTOMER_PASSWORD')) {
      this.skip();
    }
    cy.loginAs('customer');
    cy.mockSupabaseResponse('GET', '/orders', 'error403');
    cy.visit('/orders');
    cy.get('body').should('be.visible');
    // OrderHistory: toast uses orders.messages.loadError (FR/EN)
    cy.contains(
      /Erreur lors du chargement des commandes|Error loading orders/i,
      { timeout: 15000 }
    ).should('be.visible');
  });

  it('shows retry or empty when products returns 404', () => {
    cy.mockSupabaseResponse('GET', '/products', 'error404');
    cy.visit('/products');
    cy.get('body').should('be.visible');
    cy.contains('button', /retry|réessayer|Réessayer/i, {
      timeout: 25000,
    }).should('exist');
  });
});
