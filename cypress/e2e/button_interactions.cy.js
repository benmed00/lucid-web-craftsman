// cypress/e2e/button_interactions.cy.js

// This spec file tests various button interactions across the website,
// including navigation menu clicks (desktop and mobile), homepage call-to-action buttons,
// and the "Add to Cart" functionality on the products page.
describe('Button Interaction Tests', () => {
  // Test interactions with the main desktop navigation menu
  context('Desktop Navigation Menu', () => {
    beforeEach(() => {
      // Visit the homepage before each test in this context
      cy.visit('/');
    });

    // Test navigation to the Products page via the "Boutique" link
    it('should navigate to Products page when "Boutique" link is clicked', () => {
      cy.get('nav a[href="/products"]').contains('Boutique').click();
      cy.url().should('include', '/products'); // Assert URL changes to /products
    });

    // Test navigation to the Blog page via the "Blog" link
    it('should navigate to Blog page when "Blog" link is clicked', () => {
      cy.get('nav a[href="/blog"]').contains('Blog').click();
      cy.url().should('include', '/blog'); // Assert URL changes to /blog
    });

    // Test navigation to the Cart page via the "Panier" link/button
    it('should navigate to Cart page when "Panier" button is clicked', () => {
      cy.get('nav a[href="/cart"]').contains('Panier').click();
      cy.url().should('include', '/cart'); // Assert URL changes to /cart
    });
  });

  // Test interactions with the mobile navigation menu
  context('Mobile Navigation Menu', () => {
    beforeEach(() => {
      // Visit the homepage and set viewport to a mobile size
      cy.visit('/');
      cy.viewport('iphone-6');
    });

    // Test toggling the mobile menu and navigating to the Products page
    it('should toggle mobile menu and navigate to Products page', () => {
      // Click the mobile menu toggle button (selector targets button visible on small screens)
      cy.get('button.md\\:hidden').click(); // Escaping ':' for CSS selector compatibility

      // Verify the mobile menu container becomes visible
      // (selector targets div shown on small screens, absolutely positioned)
      cy.get('div.md\\:hidden.absolute').should('be.visible');

      // Click the "Boutique" link within the visible mobile menu
      cy.get('div.md\\:hidden.absolute a[href="/products"]').contains('Boutique').click();

      // Verify the URL changes to /products
      cy.url().should('include', '/products');

      // Verify the mobile menu container is no longer visible after navigation
      cy.get('div.md\\:hidden.absolute').should('not.be.visible');
    });
  });

  // Test interactions with buttons on the Homepage
  context('Homepage Buttons', () => {
    beforeEach(() => {
      // Visit the homepage before each test
      cy.visit('/');
    });

    // Test the "Découvrir" button navigates to the Products page
    it('should navigate to Products page when "Découvrir" button is clicked', () => {
      cy.contains('button', 'Découvrir').click();
      cy.url().should('include', '/products'); // Assert URL changes
    });

    // Test the "Notre Histoire" button navigates to the Blog page (assuming this is the intended target)
    it('should navigate to Blog page when "Notre Histoire" button is clicked', () => {
      cy.contains('button', 'Notre Histoire').click();
      cy.url().should('include', '/blog'); // Assert URL changes
    });
  });

  // Test "Add to Cart" functionality on the Products Page
  context('Products Page - "Ajouter" (Add to Cart) Button', () => {
    beforeEach(() => {
      // Visit the products page
      cy.visit('/products');
      // Wait for product cards to be present on the page before proceeding
      // (selector looks for divs with a class name containing "ProductCard")
      cy.get('div[class*="ProductCard"]').should('have.length.greaterThan', 0);
    });

    // Test adding a product to the cart, verifying notification and cart count update
    it('should add product to cart and show notification, then update cart count', () => {
      let initialCartCount = 0;
      // Get the initial cart count from the navigation link's text
      // This involves parsing text like "Panier (1)" to extract the number.
      cy.get('nav a[href="/cart"]').then(($cartLink) => {
        const text = $cartLink.text(); // e.g., "Panier (0)" or "Panier" if empty
        const match = text.match(/\((\d+)\)/); // Regex to find number in parentheses
        if (match) {
          initialCartCount = parseInt(match[1], 10);
        }
        // If no number is found (e.g., just "Panier"), initialCartCount remains 0.
      });

      // Find the first product card and click its "Ajouter" button
      cy.get('div[class*="ProductCard"]').first().find('button').contains('Ajouter').click();

      // Verify that a toast notification appears (using ARIA role for stability)
      // and contains the expected confirmation text.
      cy.get('div[role="status"]').should('be.visible').and('contain.text', 'ajouté au panier');
      
      // Verify the cart item count in the navigation increases
      cy.get('nav a[href="/cart"]').should(($cartLink) => {
        const text = $cartLink.text();
        const match = text.match(/\((\d+)\)/);
        let newCartCount = 0;
        if (match) {
          newCartCount = parseInt(match[1], 10);
        }
        // Assert that the new cart count is greater than the initial count
        expect(newCartCount).to.be.greaterThan(initialCartCount);
      });
    });
  });
});
