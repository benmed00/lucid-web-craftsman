/**
 * Products listing — category chips (ProductsCategoryFilters).
 *
 * Tags: @smoke @regression
 */

describe('Products page — category filters @smoke @regression', () => {
  beforeEach(() => {
    cy.visit('/products');
    cy.get('[id^="product-card-"]', { timeout: 25000 }).should(
      'have.length.at.least',
      1
    );
  });

  it('selects a category chip then resets with Tous', () => {
    cy.get('.mobile-scroll')
      .first()
      .within(() => {
        cy.get('button').should('have.length.at.least', 2);
        cy.get('button').eq(1).click();
        cy.get('button').eq(1).should('have.class', 'bg-primary');
        cy.get('button').first().click();
        cy.get('button').first().should('have.class', 'bg-primary');
      });
  });
});
