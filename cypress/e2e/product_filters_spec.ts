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

describe('Products page — search filter @smoke @regression', () => {
  it('shows no product cards when search matches nothing', () => {
    cy.visit('/products');
    cy.get('[id^="product-card-"]', { timeout: 25000 }).should(
      'have.length.at.least',
      1
    );
    const searchSelector =
      'input[placeholder*="Rechercher"], input[placeholder*="Search"], input[placeholder*="recherche"]';
    cy.get(searchSelector)
      .filter(':visible')
      .first()
      .type('xyznonexistfilter999');
    cy.contains(/Aucun résultat|no results found/i, { timeout: 8000 }).should(
      'be.visible'
    );
    cy.get('[id^="product-card-"]').should('have.length', 0);
  });
});
