// cypress/e2e/basic_navigation.cy.js

// This spec file tests basic navigation to key static pages of the application.
// It ensures that each page loads correctly by visiting its URL and
// verifying the presence and visibility of a unique element, typically the main content area or a page title.
describe('Basic Navigation Tests', () => {
  // Test for the Homepage
  it('should load the Homepage and verify a unique element', () => {
    cy.visit('/');
    // Check for the main content area to ensure the page structure is loaded
    cy.get('main').should('be.visible');
  });

  // Test for the Products Page
  it('should load the Products Page and verify a unique element', () => {
    cy.visit('/products');
    // Check for the H1 tag containing "Products" to confirm page identity
    cy.get('h1').contains('Products').should('be.visible');
  });

  // Test for the Cart Page
  it('should load the Cart Page and verify a unique element', () => {
    cy.visit('/cart');
    // Check for the H1 tag containing "Your Cart" to confirm page identity
    cy.get('h1').contains('Your Cart').should('be.visible');
  });

  // Test for the Blog Page
  it('should load the Blog Page and verify a unique element', () => {
    cy.visit('/blog');
    // Check for the H1 tag containing "Blog" to confirm page identity
    cy.get('h1').contains('Blog').should('be.visible');
  });

  // Test for the About Page
  it('should load the About Page and verify a unique element', () => {
    cy.visit('/about');
    // Check for the H1 tag containing "About Us" to confirm page identity
    cy.get('h1').contains('About Us').should('be.visible');
  });

  // Test for the Contact Page
  it('should load the Contact Page and verify a unique element', () => {
    cy.visit('/contact');
    // Check for the H1 tag containing "Contact Us" to confirm page identity
    cy.get('h1').contains('Contact Us').should('be.visible');
  });
});
