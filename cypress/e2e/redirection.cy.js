// cypress/e2e/redirection.cy.js

// This spec file tests redirection behavior, specifically focusing on 
// ensuring that users are correctly redirected to the 404 page when
// attempting to access a non-existent URL.
describe('Redirection Tests', () => {
  // Test case for verifying 404 page display
  it('should display the 404 page for a non-existent URL', () => {
    // Define a path that is highly unlikely to exist
    const nonExistentPath = '/this-page-does-not-exist-blah-blah';
    
    // Visit the non-existent path.
    // { failOnStatusCode: false } is crucial here because Cypress, by default,
    // fails tests if the server returns a non-2xx status code (like 404).
    // This option allows the test to proceed and verify the 404 page content.
    cy.visit(nonExistentPath, { failOnStatusCode: false }); 

    // Assert that the current URL still includes the path we attempted to visit
    cy.url().should('include', nonExistentPath);

    // Verify that the H1 heading specific to the 404 page is visible and contains the correct text
    cy.get('h1')
      .contains('Désolé, ce chemin semble égaré...')
      .should('be.visible');

    // Verify that the paragraph specific to the 404 page is visible and contains the correct text
    cy.get('p')
      .contains('La page demandée n’existe pas')
      .should('be.visible');
  });
});
