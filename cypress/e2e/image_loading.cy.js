// cypress/e2e/image_loading.cy.js

// This spec file tests the loading and rendering of critical images across the website,
// including the homepage hero image, product listing images, and product detail page images.
// It verifies that images are visible, have valid sources and alt text, and have successfully loaded (naturalWidth > 0).
describe('Image Loading Tests', () => {
  // Test loading of the hero image on the Homepage
  context('Homepage Hero Image', () => {
    // Test case for the homepage hero image
    it('should load the hero image correctly', () => {
      cy.visit('/');
      // Select the hero image by its specific alt text
      cy.get('img[alt="Chapeau artisanal et sac traditionnel fait main"]')
        .should('be.visible') // Assert the image is visible
        .and(($img) => {
          // Assert the image src is not empty and includes the expected filename
          expect($img[0].src).to.not.be.empty;
          expect($img[0].src).to.include('home_page_image.webp');
          // Assert the alt text is correct
          expect($img[0].alt).to.equal('Chapeau artisanal et sac traditionnel fait main');
          // Assert the image has loaded and has dimensions (naturalWidth > 0 means it's rendered)
          expect($img[0].naturalWidth).to.be.greaterThan(0);
        });
    });
  });

  // Test loading of images on the Product Listing Page
  context('Product Listing Page Images', () => {
    // Test case for images within product cards on the listing page
    it('should load images correctly on the product listing page', () => {
      cy.visit('/products');
      // Wait for product cards to be present
      cy.get('div[class*="ProductCard"]').should('have.length.greaterThan', 0);

      // Select the image within the first product card
      cy.get('div[class*="ProductCard"]').first().find('img')
        .should('be.visible') // Assert the image is visible
        .and(($img) => {
          // Assert the image src is not empty
          expect($img[0].src).to.not.be.empty;
          // Assert the alt text is not empty (important for accessibility)
          expect($img[0].alt).to.not.be.empty;
          // Assert the image has loaded and has dimensions
          expect($img[0].naturalWidth).to.be.greaterThan(0);
        });
    });
  });

  // Test loading of images on the Product Detail Page
  context('Product Detail Page Images', () => {
    // Test case for the main image and thumbnails on the product detail page
    it('should load images correctly on the product detail page', () => {
      cy.visit('/products');
      // Wait for product cards to load on the listing page
      cy.get('div[class*="ProductCard"]').should('have.length.greaterThan', 0);

      // Click on the first product card link to navigate to its detail page
      cy.get('div[class*="ProductCard"] a').first().click();

      // Verify the URL has changed to a product detail page
      cy.url().should('match', /\/products\/.+/);

      // Locate the main product image on the detail page using a more specific selector
      // Targets the first img element within the first direct div child of a div with class "grid"
      cy.get('div.grid > div:nth-child(1) img').first()
        .should('be.visible') // Assert the main image is visible
        .and(($img) => {
          // Assert the image src is not empty
          expect($img[0].src).to.not.be.empty;
          // Assert the alt text is not empty
          expect($img[0].alt).to.not.be.empty;
          // Assert the image has loaded and has dimensions
          expect($img[0].naturalWidth).to.be.greaterThan(0);
        });

      // Bonus: Check for thumbnail images
      // This selector targets images within a div that likely uses a grid layout for thumbnails (e.g., grid-cols-4)
      cy.get('div[class*="grid-cols-4"] img').first().then(($thumbnail) => {
        if ($thumbnail.length > 0) { // Check if thumbnail(s) exist
          cy.wrap($thumbnail)
            .should('be.visible') // Assert the first thumbnail is visible
            .and(($img) => {
              // Assert the thumbnail src is not empty
              expect($img[0].src).to.not.be.empty;
              // Assert the thumbnail alt text is not empty
              expect($img[0].alt).to.not.be.empty;
              // Assert the thumbnail has loaded and has dimensions
              expect($img[0].naturalWidth).to.be.greaterThan(0);
            });
        } else {
          // Log if no thumbnails are found with the specified selector (for debugging or awareness)
          cy.log('No thumbnail images found with selector: div[class*="grid-cols-4"] img');
        }
      });
    });
  });
});
