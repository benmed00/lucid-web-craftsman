/**
 * Thin route smoke tests for pages that are not fully covered elsewhere.
 * Tags: @regression
 */

describe('Payment success route @regression', () => {
  it('shows incomplete-link message on /order-confirmation without payment params', () => {
    // No session_id / PayPal return → OrderConfirmation (not PaymentSuccess).
    // OrderConfirmation uses a fixed FR copy when ?token is absent.
    cy.visit('/order-confirmation');
    cy.contains(/Impossible d'afficher la commande/i, {
      timeout: 15000,
    }).should('be.visible');
  });
});

describe('Unsubscribe route @regression', () => {
  it('loads the unsubscribe page with layout', () => {
    cy.visit('/unsubscribe');
    cy.get('body').should('be.visible');
    cy.get('main, #main-content, [role="main"], .min-h-screen', {
      timeout: 10000,
    }).should('exist');
  });

  it('loads unsubscribe with email query param', () => {
    cy.visit('/unsubscribe?email=test%40example.com');
    cy.contains(/désabonner|unsubscribe|email/i, { timeout: 10000 }).should(
      'exist'
    );
  });
});
