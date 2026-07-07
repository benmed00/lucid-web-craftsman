/**
 * AdminDataTable — sorting, pagination & selection with stubbed network.
 *
 * We intercept the Supabase PostgREST call that feeds /admin/products so
 * the visible dataset is deterministic and assertions on sort order,
 * pagination cursor and row selection are stable in CI.
 *
 * Requires ADMIN_EMAIL / ADMIN_PASSWORD (see cypress.env.example.json)
 * because /admin/* is gated by RequireAdmin.
 *
 * Tags: @regression
 */

const FIXTURE = 'admin/products-datatable.json';

describe('AdminDataTable — stubbed dataset @regression', () => {
  before(function () {
    if (!Cypress.env('ADMIN_EMAIL') || !Cypress.env('ADMIN_PASSWORD')) {
      cy.log('Skipping: ADMIN_EMAIL / ADMIN_PASSWORD not set');
      this.skip();
    }
  });

  beforeEach(() => {
    // Stub every REST read on the products table. The admin products hook
    // calls `.from('products').select('*').eq('is_active', true).order('id')`
    // which PostgREST routes to GET /rest/v1/products?select=*&...
    cy.intercept(
      { method: 'GET', url: '**/rest/v1/products*' },
      { fixture: FIXTURE, statusCode: 200 }
    ).as('getProducts');

    cy.loginAs('admin');
    cy.visit('/admin/products');
    cy.wait('@getProducts');

    // Confirm the stubbed rows are in the DOM before running assertions.
    cy.contains('table tbody tr', 'ADT Alpha Bag', {
      timeout: 15000,
    }).should('be.visible');
  });

  it('renders the first page from the fixture', () => {
    // Default itemsPerPage is 12 in useAdminProducts.
    cy.get('table tbody tr').should('have.length', 12);
    cy.get('table tbody tr').first().should('contain.text', 'ADT Alpha Bag');
    cy.get('table tbody tr').last().should('contain.text', 'ADT Lima Hat');
  });

  it('sorts by price ascending then descending when the header is clicked', () => {
    // Two clicks → asc then desc (toggleSort in AdminDataTable).
    cy.contains('table thead button', 'Prix').click();
    cy.get('table tbody tr')
      .first()
      .find('td')
      .eq(3) // Prix column (Image | Produit | Catégorie | Prix)
      .should('contain.text', '10');

    cy.contains('table thead button', 'Prix').click();
    cy.get('table tbody tr')
      .first()
      .find('td')
      .eq(3)
      .should('contain.text', '150');
  });

  it('paginates to the next page without refetching', () => {
    cy.get('@getProducts.all').should('have.length', 1);

    cy.contains('button', 'Suivant').click();

    // Page 2 shows the remaining 3 rows (15 total − 12 per page).
    cy.get('table tbody tr').should('have.length', 3);
    cy.contains('table tbody tr', 'ADT Mike Bag').should('be.visible');
    cy.contains('table tbody tr', 'ADT Oscar Bag').should('be.visible');

    // Pagination is client-side over the cached dataset → no extra fetch.
    cy.get('@getProducts.all').should('have.length', 1);
  });

  it('highlights the row selected via click', () => {
    cy.contains('table tbody tr', 'ADT Bravo Hat')
      .click()
      .should('have.class', 'bg-muted');
  });
});
