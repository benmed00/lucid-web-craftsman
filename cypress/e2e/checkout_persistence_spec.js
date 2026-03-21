/**
 * E2E Test: Anonymous checkout session persistence
 * Validates that guest user data survives page reload.
 */

describe('Checkout Persistence — Anonymous User', () => {
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
    cy.get('button')
      .contains(/livraison|shipping/i)
      .first()
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

    cy.get('#firstName').should('have.value', testData.firstName);
  });

  it('should clear form fields when localStorage checkout data is removed', () => {
    cy.visit('/checkout');
    cy.window().then((win) => {
      win.localStorage.setItem('checkout_form_data', JSON.stringify(testData));
      win.localStorage.setItem('checkout_timestamp', String(Date.now()));
    });
    cy.reload();

    cy.get('#firstName', { timeout: 15000 }).should(
      'have.value',
      testData.firstName
    );

    cy.window().then((win) => {
      win.localStorage.removeItem('checkout_form_data');
      win.localStorage.removeItem('checkout_timestamp');
    });
    cy.reload();

    cy.get('#firstName', { timeout: 15000 }).should(
      'not.have.value',
      testData.firstName
    );
  });
});
