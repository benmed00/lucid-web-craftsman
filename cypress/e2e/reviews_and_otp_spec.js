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

describe('Product reviews — logged-in form @regression', () => {
  before(function () {
    if (!Cypress.env('CUSTOMER_EMAIL') || !Cypress.env('CUSTOMER_PASSWORD')) {
      cy.log(
        'Skipping review form: set CUSTOMER_EMAIL / CUSTOMER_PASSWORD for authenticated UI'
      );
      this.skip();
    }
  });

  it('opens the leave-review form from the card', () => {
    cy.loginAs('customer');
    cy.visit('/products');
    cy.get('[id^="product-card-"]').first().find('a').first().click();
    cy.url().should('match', /\/products\/\d+/);
    cy.contains('h3', 'Avis clients', { timeout: 20000 })
      .scrollIntoView()
      .should('be.visible');
    cy.contains('button', 'Laisser un avis', { timeout: 15000 })
      .should('be.visible')
      .click();
    cy.contains('h4', /Laisser un avis pour/, { timeout: 10000 }).should(
      'be.visible'
    );
    cy.get('#title').should('be.visible');
    cy.get('#comment').should('be.visible');
  });
});

describe('Auth OTP mode UI @regression', () => {
  it('switches to secure code mode and shows OTP entry points', () => {
    cy.visit('/auth');
    // Tabs: [0] traditional, [1] OTP / « code sécurisé »
    cy.get('[role="tab"]').eq(1).click();
    cy.contains(/code sécurisé|secure code/i, { timeout: 8000 }).should(
      'be.visible'
    );
    cy.contains('button', /Se connecter par code|sign in by code/i, {
      timeout: 8000,
    }).should('be.visible');
    cy.contains('button', /inscrire par code|sign up by code/i, {
      timeout: 8000,
    }).should('be.visible');
  });
});
