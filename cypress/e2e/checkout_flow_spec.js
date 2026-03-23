/**
 * E2E Test Suite: Full Checkout Flow
 * Covers: add to cart → personal info → shipping → payment → promo codes
 */

describe('Checkout Flow @smoke @regression', () => {
  beforeEach(() => {
    cy.stubCheckoutIntercepts();
    cy.visit('/products');
    cy.get('body').should('be.visible');
  });

  it('should add a product to the cart', () => {
    // Use stable ID selector (matches enterprise spec and product cards)
    cy.get('[id^="add-to-cart-btn-"]').first().should('be.visible').click();
    // Cart link should exist (header shows cart)
    cy.get('a[href="/cart"]').should('exist');
  });

  it('should navigate to checkout with items in cart', () => {
    // Add a product
    cy.get('[id^="add-to-cart-btn-"]').first().click();
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
    cy.get('[id^="add-to-cart-btn-"]').first().click();
    cy.visit('/checkout');

    // Wait for form to load (skeleton gone, persistence ready)
    cy.get('#firstName', { timeout: 15000 }).should('be.visible');
    cy.get('#firstName').clear().type('Jean');
    cy.get('#lastName').clear().type('Dupont');
    cy.get('#email').clear().type('jean.dupont@test.com');
    cy.get('#phone').clear().type('+33612345678');

    // Use fieldset to target step 1 button (avoids sidebar)
    cy.get('fieldset')
      .find('button')
      .contains(/livraison|shipping|suivant|next|continuer/i)
      .should('be.visible')
      .click();

    cy.get('#address', { timeout: 15000 }).should('be.visible');
  });

  it('should fill shipping info and advance to payment', () => {
    cy.get('[id^="add-to-cart-btn-"]').first().click();
    cy.visit('/checkout');

    cy.get('#firstName', { timeout: 15000 }).should('be.visible');
    cy.get('#firstName').clear().type('Jean');
    cy.get('#lastName').clear().type('Dupont');
    cy.get('#email').clear().type('jean.dupont@test.com');
    cy.get('fieldset')
      .find('button')
      .contains(/livraison|shipping|suivant|next|continuer/i)
      .should('be.visible')
      .click();

    cy.get('#address', { timeout: 15000 }).should('be.visible');
    cy.get('#address').type('12 Rue de la Paix');
    cy.get('#postalCode').type('75001');
    cy.get('#city').type('Paris');

    // Avoid matching hidden mobile bar ("Procéder au Paiement") or sidebar copy
    cy.get('[data-testid="checkout-continue-to-payment"]')
      .filter(':visible')
      .click();

    // Payment step: card option (#card) or payment title/options text
    cy.contains(/visa|mastercard|paiement sécurisé|secure payment/i, {
      timeout: 15000,
    }).should('be.visible');
  });

  it('should show error for invalid promo code', () => {
    cy.get('[id^="add-to-cart-btn-"]').first().click();
    cy.visit('/checkout');

    // Wait for checkout to load, then find promo input (FR: "Entrez votre code", EN: "Enter your code")
    cy.get('#firstName', { timeout: 15000 }).should('be.visible');
    cy.get(
      'input[placeholder*="promo"], input[placeholder*="code"], input[placeholder*="Code"]'
    )
      .first()
      .type('INVALIDCODE123');
    cy.get('button')
      .contains(/appliquer|apply/i)
      .first()
      .click();

    cy.get('.text-destructive, [role="alert"]', { timeout: 10000 }).should(
      'be.visible'
    );
  });

  it('should clear promo error when user types new code', () => {
    cy.get('[id^="add-to-cart-btn-"]').first().click();
    cy.visit('/checkout');

    cy.get('#firstName', { timeout: 15000 }).should('be.visible');
    cy.get(
      'input[placeholder*="promo"], input[placeholder*="code"], input[placeholder*="Code"]'
    )
      .first()
      .type('BAD');
    cy.get('button')
      .contains(/appliquer|apply/i)
      .first()
      .click();

    cy.get('.text-destructive, [role="alert"]', { timeout: 10000 }).should(
      'be.visible'
    );

    // Type new code — promo error clears on input change (force: sidebar may be covered by header)
    cy.get(
      'input[placeholder*="promo"], input[placeholder*="code"], input[placeholder*="Code"]'
    )
      .first()
      .scrollIntoView()
      .clear({ force: true })
      .type('NEW', { force: true });
    cy.contains(/code promo invalide|invalid promo code/i).should('not.exist');
  });

  it('should show postal code format hint based on country', () => {
    cy.get('[id^="add-to-cart-btn-"]').first().click();
    cy.visit('/checkout');

    cy.get('#firstName', { timeout: 15000 }).should('be.visible');
    cy.get('#firstName').clear().type('Jean');
    cy.get('#lastName').clear().type('Dupont');
    cy.get('#email').clear().type('jean.dupont@test.com');
    cy.get('fieldset')
      .find('button')
      .contains(/livraison|shipping|suivant|next|continuer/i)
      .should('be.visible')
      .click();

    cy.get('#address', { timeout: 15000 }).should('be.visible');
    cy.contains(/5 chiffres|5 digits/i).should('be.visible');

    cy.get('#country').select('BE');
    cy.contains(/4 chiffres|4 digits/i).should('be.visible');
  });

  it('should validate postal code format per country', () => {
    cy.get('[id^="add-to-cart-btn-"]').first().click();
    cy.visit('/checkout');

    cy.get('#firstName', { timeout: 15000 }).should('be.visible');
    cy.get('#firstName').clear().type('Jean');
    cy.get('#lastName').clear().type('Dupont');
    cy.get('#email').clear().type('jean.dupont@test.com');
    cy.get('fieldset')
      .find('button')
      .contains(/livraison|shipping|suivant|next|continuer/i)
      .should('be.visible')
      .click();

    cy.get('#address', { timeout: 15000 }).should('be.visible');
    cy.get('#address').type('12 Rue de la Paix');
    cy.get('#postalCode').type('123'); // too short for FR
    cy.get('#city').type('Paris');
    cy.get('[data-testid="checkout-continue-to-payment"]')
      .filter(':visible')
      .click();

    cy.get('.text-destructive, [role="alert"]', { timeout: 10000 }).should(
      'be.visible'
    );
  });

  it('should increase and decrease line-item quantity on cart page', () => {
    cy.get('[id^="add-to-cart-btn-"]').first().click();
    cy.visit('/cart');
    const qtyLabel = '[aria-label^="Quantité:"], [aria-label^="Quantity:"]';
    // cart-item-* id is on the product title <h3>, not the line card — use article
    cy.get('[role="article"]')
      .first()
      .within(() => {
        cy.get(qtyLabel).first().should('have.text', '1');
        cy.get('[id^="cart-qty-plus-"]').click();
        cy.get(qtyLabel).first().should('have.text', '2');
        cy.get('[id^="cart-qty-minus-"]').click();
        cy.get(qtyLabel).first().should('have.text', '1');
      });
  });
});
