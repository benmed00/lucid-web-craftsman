/**
 * E2E Test Suite: Full Checkout Flow
 * Covers: add to cart → personal info → shipping → payment → promo codes
 */

describe('Checkout Flow @smoke @regression', () => {
  beforeEach(() => {
    cy.visit('/products');
    cy.get('body').should('be.visible');
  });

  it('should add a product to the cart', () => {
    // Click the first "Add to cart" button on the products page
    cy.get('[data-testid="add-to-cart"], button')
      .contains(/ajouter|add/i)
      .first()
      .click();
    // Cart icon should show at least 1 item
    cy.get(
      '[data-testid="cart-count"], [aria-label*="cart"], .cart-count'
    ).should('exist');
  });

  it('should navigate to checkout with items in cart', () => {
    // Add a product
    cy.get('button')
      .contains(/ajouter|add/i)
      .first()
      .click();
    // Go to cart
    cy.visit('/cart');
    cy.get('body').should('be.visible');
    // Click proceed to checkout
    cy.get('button, a')
      .contains(/commander|checkout|paiement/i)
      .first()
      .click();
    cy.url().should('include', '/checkout');
  });

  it('should fill personal info and advance to shipping', () => {
    // Add product and go to checkout
    cy.get('button')
      .contains(/ajouter|add/i)
      .first()
      .click();
    cy.visit('/checkout');

    // Fill personal info
    cy.get('#firstName').type('Jean');
    cy.get('#lastName').type('Dupont');
    cy.get('#email').type('jean.dupont@test.com');
    cy.get('#phone').type('+33612345678');

    // Advance to step 2
    cy.get('button')
      .contains(/livraison|shipping/i)
      .first()
      .click();

    // Should show shipping form
    cy.get('#address').should('be.visible');
  });

  it('should fill shipping info and advance to payment', () => {
    cy.get('button')
      .contains(/ajouter|add/i)
      .first()
      .click();
    cy.visit('/checkout');

    // Step 1
    cy.get('#firstName').type('Jean');
    cy.get('#lastName').type('Dupont');
    cy.get('#email').type('jean.dupont@test.com');
    cy.get('button')
      .contains(/livraison|shipping/i)
      .first()
      .click();

    // Step 2
    cy.get('#address').type('12 Rue de la Paix');
    cy.get('#postalCode').type('75001');
    cy.get('#city').type('Paris');

    // Advance to payment
    cy.get('button')
      .contains(/paiement|payment/i)
      .first()
      .click();

    // Should show payment options
    cy.get('input[value="card"]').should('exist');
  });

  it('should show error for invalid promo code', () => {
    cy.get('button')
      .contains(/ajouter|add/i)
      .first()
      .click();
    cy.visit('/checkout');

    // Enter invalid promo code in sidebar
    cy.get('input[placeholder*="promo"], input[placeholder*="Code"]')
      .first()
      .type('INVALIDCODE123');
    cy.get('button')
      .contains(/appliquer|apply/i)
      .first()
      .click();

    // Should show error message
    cy.get('.text-destructive').should('be.visible');
  });

  it('should clear promo error when user types new code', () => {
    cy.get('button')
      .contains(/ajouter|add/i)
      .first()
      .click();
    cy.visit('/checkout');

    // Enter invalid promo code
    cy.get('input[placeholder*="promo"], input[placeholder*="Code"]')
      .first()
      .type('BAD');
    cy.get('button')
      .contains(/appliquer|apply/i)
      .first()
      .click();

    // Wait for error
    cy.get('.text-destructive').should('be.visible');

    // Type a new code — error should clear
    cy.get('input[placeholder*="promo"], input[placeholder*="Code"]')
      .first()
      .clear()
      .type('NEW');
    cy.get('.text-destructive').should('not.exist');
  });

  it('should show postal code format hint based on country', () => {
    cy.get('button')
      .contains(/ajouter|add/i)
      .first()
      .click();
    cy.visit('/checkout');

    // Step 1
    cy.get('#firstName').type('Jean');
    cy.get('#lastName').type('Dupont');
    cy.get('#email').type('jean.dupont@test.com');
    cy.get('button')
      .contains(/livraison|shipping/i)
      .first()
      .click();

    // France is default — check hint
    cy.contains('5 chiffres').should('be.visible');

    // Switch to Belgium
    cy.get('#country').select('BE');
    cy.contains('4 chiffres').should('be.visible');
  });

  it('should validate postal code format per country', () => {
    cy.get('button')
      .contains(/ajouter|add/i)
      .first()
      .click();
    cy.visit('/checkout');

    // Fill step 1
    cy.get('#firstName').type('Jean');
    cy.get('#lastName').type('Dupont');
    cy.get('#email').type('jean.dupont@test.com');
    cy.get('button')
      .contains(/livraison|shipping/i)
      .first()
      .click();

    // Enter invalid postal code for France
    cy.get('#address').type('12 Rue de la Paix');
    cy.get('#postalCode').type('123'); // too short
    cy.get('#city').type('Paris');
    cy.get('button')
      .contains(/paiement|payment/i)
      .first()
      .click();

    // Should show validation error
    cy.get('.text-destructive').should('be.visible');
  });
});
