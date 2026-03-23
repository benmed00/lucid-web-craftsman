/**
 * Products listing — category chips (ProductsCategoryFilters).
 *
 * Tags: @smoke @regression
 */

const catalogProductCards =
  '[data-testid="products-catalog"] [id^="product-card-"]';

describe('Products page — category filters @smoke @regression', () => {
  beforeEach(() => {
    cy.stubProductsCatalog();
    cy.visit('/products');
    cy.get(catalogProductCards, { timeout: 25000 }).should(
      'have.length.at.least',
      1
    );
  });

  it('selects a category chip then resets with Tous', () => {
    cy.get('.mobile-scroll')
      .first()
      .within(() => {
        cy.get('button').should('have.length.at.least', 2);
        // Pull-to-refresh indicator sits above the strip; avoid flake from hit targets
        cy.get('button').eq(1).click({ force: true });
        cy.get('button').eq(1).should('have.class', 'bg-primary');
        cy.get('button').first().click({ force: true });
        cy.get('button').first().should('have.class', 'bg-primary');
      });
  });
});

describe('Products page — search filter @smoke @regression', () => {
  it('shows no product cards when search matches nothing', () => {
    cy.stubProductsCatalog();
    cy.visit('/products');
    cy.get(catalogProductCards, { timeout: 25000 }).should(
      'have.length.at.least',
      1
    );
    // Main catalog only (not recommendations / recently viewed — same product-card id pattern)
    cy.get('[data-testid="products-page-search"]')
      .filter(':visible')
      .first()
      .clear()
      .type('xyznonexistfilter999');
    // Deferred searchQuery vs filteredCount: wait until grid is empty, then assert copy
    cy.get(catalogProductCards, { timeout: 25000 }).should('have.length', 0);
    cy.contains(
      /Aucun résultat|aucun résultat trouvé|no results|0\s+résultat/i,
      {
        timeout: 10000,
      }
    ).should('be.visible');
  });
});
