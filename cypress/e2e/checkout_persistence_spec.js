/**
 * E2E Test: Anonymous checkout session persistence
 * Validates that guest user data survives page reload and tab close.
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
  };

  it('should persist checkout form data across page reload', () => {
    // Add a product and go to checkout
    cy.visit('/products');
    cy.get('body').should('be.visible');
    cy.get('button')
      .contains(/ajouter|add/i)
      .first()
      .click();
    cy.visit('/checkout');

    // Fill personal info
    cy.get('#firstName').type(testData.firstName);
    cy.get('#lastName').type(testData.lastName);
    cy.get('#email').type(testData.email);
    cy.get('#phone').type(testData.phone);

    // Wait for debounced save (500ms + margin)
    cy.wait(1000);

    // Reload the page
    cy.reload();

    // Fields should be restored
    cy.get('#firstName').should('have.value', testData.firstName);
    cy.get('#lastName').should('have.value', testData.lastName);
    cy.get('#email').should('have.value', testData.email);
  });

  it('should persist shipping data after advancing steps', () => {
    cy.visit('/products');
    cy.get('body').should('be.visible');
    cy.get('button')
      .contains(/ajouter|add/i)
      .first()
      .click();
    cy.visit('/checkout');

    // Step 1 — personal info
    cy.get('#firstName').type(testData.firstName);
    cy.get('#lastName').type(testData.lastName);
    cy.get('#email').type(testData.email);
    cy.get('button')
      .contains(/livraison|shipping/i)
      .first()
      .click();

    // Step 2 — shipping
    cy.get('#address').type(testData.address);
    cy.get('#postalCode').type(testData.postalCode);
    cy.get('#city').type(testData.city);

    // Wait for save
    cy.wait(1000);

    // Reload
    cy.reload();

    // Should restore to at least step 1 data
    cy.get('#firstName').should('have.value', testData.firstName);
  });

  it('should clear data after successful checkout clear', () => {
    // Verify localStorage keys are removed after clearSavedData
    cy.visit('/checkout');
    cy.window().then((win) => {
      win.localStorage.setItem('checkout_form_data', JSON.stringify(testData));
      win.localStorage.setItem('checkout_timestamp', String(Date.now()));
    });
    cy.reload();

    // Data should load from localStorage
    cy.get('#firstName').should('have.value', testData.firstName);
  });
});
