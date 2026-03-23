/**
 * E2E Test: Anonymous checkout session persistence
 * Validates that guest user data survives page reload.
 */

describe('Checkout Persistence — Anonymous User', () => {
  beforeEach(() => {
    cy.stubCheckoutIntercepts();
    // Avoid re-hydrating cleared checkout fields from Supabase profile/shipping in E2E
    cy.intercept('GET', '**/rest/v1/profiles**', { statusCode: 200, body: [] });
    cy.intercept('GET', '**/rest/v1/shipping_addresses**', {
      statusCode: 200,
      body: [],
    });
  });

  const testData = {
    firstName: 'Amina',
    lastName: 'Benali',
    email: 'amina.benali@test.com',
    phone: '+33698765432',
    address: '5 Avenue Hassan II',
    postalCode: '75010',
    city: 'Paris',
    country: 'FR',
  };

  it('should persist checkout form data across page reload', () => {
    cy.addProductToCart();
    cy.visit('/checkout');

    cy.get('#firstName', { timeout: 15000 }).should('be.visible');
    cy.get('#firstName').type(testData.firstName);
    cy.get('#lastName').type(testData.lastName);
    cy.get('#email').type(testData.email);
    cy.get('#phone').type(testData.phone);

    cy.window()
      .its('localStorage')
      .invoke('getItem', 'checkout_form_data')
      .should('not.be.null');

    cy.reload();

    cy.get('#firstName').should('have.value', testData.firstName);
    cy.get('#lastName').should('have.value', testData.lastName);
    cy.get('#email').should('have.value', testData.email);
  });

  it('should persist shipping data after advancing steps', () => {
    cy.addProductToCart();
    cy.visit('/checkout');

    cy.get('#firstName', { timeout: 15000 }).should('be.visible');
    cy.get('#firstName').type(testData.firstName);
    cy.get('#lastName').type(testData.lastName);
    cy.get('#email').type(testData.email);
    cy.get('[data-testid="checkout-continue-to-shipping"]')
      .filter(':visible')
      .click();

    cy.get('#address', { timeout: 15000 }).should('be.visible');
    cy.get('#address').type(testData.address);
    cy.get('#postalCode').type(testData.postalCode);
    cy.get('#city').type(testData.city);

    cy.window()
      .its('localStorage')
      .invoke('getItem', 'checkout_form_data')
      .should('not.be.null');

    cy.reload();

    // Restored to shipping step → personal fields are not mounted until user opens step 1
    cy.get(
      'button[aria-label*="Informations"], button[aria-label*="Information"]',
      {
        timeout: 15000,
      }
    )
      .first()
      .click();
    cy.get('#firstName', { timeout: 15000 }).should(
      'have.value',
      testData.firstName
    );
  });

  it('should clear form fields when localStorage checkout data is removed', () => {
    cy.addProductToCart();
    cy.visit('/checkout');
    cy.get('#firstName', { timeout: 15000 })
      .should('be.visible')
      .clear()
      .type(testData.firstName);
    cy.get('#lastName').clear().type(testData.lastName);
    cy.get('#email').clear().type(testData.email);

    cy.reload({
      cache: false,
      onBeforeLoad(win) {
        win.localStorage.removeItem('checkout_form_data');
        win.localStorage.removeItem('checkout_timestamp');
        win.localStorage.removeItem('checkout_current_step');
        win.localStorage.removeItem('checkout_completed_steps');
        win.sessionStorage.removeItem('checkout_form_data');
        win.sessionStorage.removeItem('checkout_current_step');
        win.sessionStorage.removeItem('checkout_completed_steps');
      },
    });

    cy.get('#firstName', { timeout: 15000 }).should('have.value', '');
  });
});
