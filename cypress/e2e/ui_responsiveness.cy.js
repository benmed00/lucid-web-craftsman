// cypress/e2e/ui_responsiveness.cy.js

// This spec file is intended to test various UI responsiveness aspects of the application.
// Currently, it includes tests for page load times and UI update responsiveness.
describe('UI Responsiveness Tests', () => {

  // Context for Products Page Load Responsiveness tests
  context('Products Page Load Responsiveness', () => {

    // Test Case 1: Products page should load and display products within an acceptable time
    it('should load and display products within an acceptable time', () => {
      const MAX_LOAD_TIME_MS = 1500; // Threshold includes the 300ms mock API delay + rendering time

      // Record time just before the action that triggers loading (cy.visit)
      const startTime = Date.now(); 
      
      cy.visit('/products');
      
      // Assertion that products are loaded and at least one product name is visible
      cy.get('div[class*="ProductCard"] h3') // Selector for product names within cards
        .should('have.length.greaterThan', 0) // Ensure at least one product card is rendered
        .first() // Take the first product card's h3
        .should('not.be.empty'); // Ensure it has text (product name is present)
        
      // After the assertions have passed, calculate the duration
      cy.then(() => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        cy.log(`Products page full load time: ${duration} ms`);
        expect(duration).to.be.lessThan(MAX_LOAD_TIME_MS);
      });
    });
  });

  // Context for "Add to Cart" UI Responsiveness tests
  context('Add to Cart UI Responsiveness', () => {

    // Test Case 2: "Add to Cart" action should update UI within an acceptable time
    it('should update cart count and show toast within an acceptable time after adding to cart', () => {
      const MAX_UPDATE_TIME_MS = 700; // Threshold includes 100ms mock delay + rendering

      cy.visit('/products');

      // Ensure products are loaded first
      cy.get('div[class*="ProductCard"] h3')
        .should('have.length.greaterThan', 0);

      // Get initial cart count for comparison
      let initialCartCount = 0;
      cy.get('nav a[href="/cart"]').then(($cartLink) => {
        const text = $cartLink.text();
        const match = text.match(/\((\d+)\)/);
        if (match) {
          initialCartCount = parseInt(match[1], 10);
        }
      });

      const startTime = Date.now(); // Record time just before clicking "Ajouter"

      // Find the first product card and click its "Ajouter" button
      cy.get('div[class*="ProductCard"]').first().find('button').contains('Ajouter').click();

      // Wait for two things:
      // 1. Toast notification to appear
      cy.get('div[role="status"]').should('be.visible').and('contain.text', 'ajouté au panier');
      
      // 2. Cart item count in the navigation to update
      cy.get('nav a[href="/cart"]').should(($cartLink) => {
        const text = $cartLink.text();
        const match = text.match(/\((\d+)\)/);
        let newCartCount = 0;
        if (match) {
          newCartCount = parseInt(match[1], 10);
        }
        expect(newCartCount).to.be.greaterThan(initialCartCount);
      });

      cy.then(() => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        cy.log(`Add to Cart UI update time: ${duration} ms`);
        expect(duration).to.be.lessThan(MAX_UPDATE_TIME_MS);
      });
    });
  });

  // Context for Product Detail Page Load Responsiveness tests
  context('Product Detail Page Load Responsiveness', () => {

    // Test Case 3: Product detail page should load and display content within an acceptable time
    it('should load and display product details within an acceptable time', () => {
      const MAX_DETAIL_LOAD_TIME_MS = 1000; // Threshold includes 200ms mock delay + rendering
      const productIdToTest = 1; // Assuming product with ID 1 exists (from mock data)

      // Record time just before visiting the product detail page
      const startTime = Date.now(); 
      cy.visit(`/products/${productIdToTest}`);
      
      // Assertion that product details are loaded
      // Check for product name (h1), price, and description
      cy.get('h1').should('not.be.empty'); // Product Name should be present in H1
      cy.contains('€').should('be.visible'); // Check for price indication (e.g., currency symbol)
      
      // Check for a reasonably long paragraph, likely the product description.
      // This is more robust than an exact match if the description content can change.
      cy.get('p').filter((index, p) => Cypress.$(p).text().length > 50).should('exist'); 

      cy.then(() => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        cy.log(`Product detail page (ID: ${productIdToTest}) full load time: ${duration} ms`);
        expect(duration).to.be.lessThan(MAX_DETAIL_LOAD_TIME_MS);
      });
    });
  });
});
