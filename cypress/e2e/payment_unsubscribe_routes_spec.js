/**
 * Thin route smoke tests for pages that are not fully covered elsewhere.
 * Tags: @regression
 */

describe('Payment success route @regression', () => {
  it('shows missing-session message without Stripe session_id', () => {
    cy.visit('/order-confirmation');
    cy.contains(/Session de paiement manquante|Missing payment session/i, {
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
