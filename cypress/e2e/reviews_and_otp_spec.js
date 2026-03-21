/**
 * Product reviews block + Auth OTP mode UI (no real SMS).
 * Tags: @regression
 */

describe('Product reviews section @regression', () => {
  it('shows the reviews card on product detail', () => {
    cy.visit('/products');
    cy.get('[id^="product-card-"]').first().find('a').first().click();
    cy.url().should('match', /\/products\/\d+/);
    cy.contains('h3', 'Avis clients', { timeout: 20000 })
      .scrollIntoView()
      .should('be.visible');
  });
});

describe('Auth OTP mode UI @regression', () => {
  it('switches to secure code mode and shows OTP entry points', () => {
    cy.visit('/auth');
    // Tabs: [0] traditional, [1] OTP / « code sécurisé »
    cy.get('[role="tab"]').eq(1).click();
    cy.contains('button', /connexion|sign in/i, { timeout: 8000 }).should(
      'be.visible'
    );
    cy.contains('button', /inscription|sign up/i, { timeout: 8000 }).should(
      'be.visible'
    );
  });
});
