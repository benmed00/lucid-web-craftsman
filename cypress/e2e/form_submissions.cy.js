// cypress/e2e/form_submissions.cy.js

// This spec file tests form submissions for the Newsletter Subscription
// on the Homepage, the "Message" and "Commande" forms on the Contact Page,
// and the multi-step Checkout process.

import * as mockApiService from '../../src/api/mockApiService';

describe('Form Submission Tests', () => {

  // Tests for the Newsletter Subscription Form on the Homepage
  context('Newsletter Subscription Form', () => {
    const newsletterEmailInputSelector = 'input[placeholder="Votre adresse email"]';
    const newsletterSubmitButtonSelector = 'button[type="submit"]'; 

    beforeEach(() => {
      cy.visit('/');
    });

    it('should allow submission with a valid email and clear input', () => {
      const validEmail = 'test@example.com';
      cy.get(newsletterEmailInputSelector).type(validEmail);
      cy.contains(newsletterSubmitButtonSelector, "S'abonner").click();
      cy.get(newsletterEmailInputSelector).should('have.value', '');
    });

    it('should prevent submission or show validation for invalid email format', () => {
      const invalidEmail = 'test@invalid';
      cy.get(newsletterEmailInputSelector).type(invalidEmail);
      cy.contains(newsletterSubmitButtonSelector, "S'abonner").click();
      cy.get(newsletterEmailInputSelector).then(($input) => {
        expect($input[0].checkValidity()).to.be.false;
      });
    });

    it('should prevent submission or show validation for empty email', () => {
      cy.contains(newsletterSubmitButtonSelector, "S'abonner").click();
      cy.get(newsletterEmailInputSelector).then(($input) => {
        if ($input[0].required) {
          expect($input[0].checkValidity()).to.be.false;
        } else {
          cy.log('Input is not marked as required. Behavior for empty submission might vary.');
          cy.get(newsletterEmailInputSelector).should('have.value', '');
        }
      });
    });
  });

  // Tests for the Contact Page - "Message" Form
  context('Contact Page - "Message" Form', () => {
    const firstNameInput = 'input#firstName';
    const lastNameInput = 'input#lastName';
    const emailInput = 'input#email';
    const subjectInput = 'input#subject';
    const messageTextarea = 'textarea#message';
    const submitButton = 'button[type="submit"]';

    beforeEach(() => {
      cy.visit('/contact');
      cy.get('button[role="tab"][value="message"]').click();
    });

    it('should allow submission with valid data and clear fields', () => {
      cy.get(firstNameInput).type('John');
      cy.get(lastNameInput).type('Doe');
      cy.get(emailInput).type('john.doe@example.com');
      cy.get(subjectInput).type('Test Subject');
      cy.get(messageTextarea).type('This is a test message.');
      cy.contains(submitButton, 'Envoyer le message').click();

      cy.get(firstNameInput).should('have.value', '');
      cy.get(lastNameInput).should('have.value', '');
      cy.get(emailInput).should('have.value', '');
      cy.get(subjectInput).should('have.value', '');
      cy.get(messageTextarea).should('have.value', '');
    });

    it('should prevent submission if a required field (Email) is empty', () => {
      cy.get(firstNameInput).type('Jane');
      cy.get(lastNameInput).type('Doe');
      cy.get(subjectInput).type('Incomplete Test');
      cy.get(messageTextarea).type('Trying to submit with no email.');
      cy.contains(submitButton, 'Envoyer le message').click();
      cy.get(`${emailInput}:invalid`).should('exist');
      cy.get(emailInput).then(($input) => {
        expect($input[0].checkValidity()).to.be.false;
      });
    });

    it('should prevent submission with invalid email format', () => {
      cy.get(firstNameInput).type('Test');
      cy.get(lastNameInput).type('User');
      cy.get(emailInput).type('test@invalid');
      cy.get(subjectInput).type('Invalid Email Test');
      cy.get(messageTextarea).type('Testing submission with an invalid email.');
      cy.contains(submitButton, 'Envoyer le message').click();
      cy.get(`${emailInput}:invalid`).should('exist');
      cy.get(emailInput).then(($input) => {
        expect($input[0].checkValidity()).to.be.false;
      });
    });
  });

  // Tests for the Contact Page - "Commande" (Order) Form
  context('Contact Page - "Commande" Form', () => {
    const orderNameInput = 'input#orderName';
    const orderNumberInput = 'input#orderNumber';
    const orderEmailInput = 'input#orderEmail';
    const orderSubjectSelect = 'select#orderSubject';
    const orderMessageTextarea = 'textarea#orderMessage';
    const orderSubmitButton = 'button[type="submit"]';

    beforeEach(() => {
      cy.visit('/contact');
      cy.get('button[role="tab"][value="commande"]').click();
    });

    it('should allow submission with valid data and clear fields', () => {
      cy.get(orderNameInput).type('Jane Commande');
      cy.get(orderNumberInput).type('ORD12345');
      cy.get(orderEmailInput).type('jane.commande@example.com');
      cy.get(orderSubjectSelect).select('status');
      cy.get(orderMessageTextarea).type('This is a test message regarding an order.');
      cy.contains(orderSubmitButton, 'Envoyer la demande').click();

      cy.get(orderNameInput).should('have.value', '');
      cy.get(orderNumberInput).should('have.value', '');
      cy.get(orderEmailInput).should('have.value', '');
      cy.get(orderSubjectSelect).should('have.value', '');
      cy.get(orderMessageTextarea).should('have.value', '');
    });

    it('should prevent submission if Nom complet is empty', () => {
      cy.get(orderNumberInput).type('ORD54321');
      cy.get(orderEmailInput).type('test.emptyname@example.com');
      cy.get(orderSubjectSelect).select('modification');
      cy.get(orderMessageTextarea).type('Trying to submit with no name.');
      cy.contains(orderSubmitButton, 'Envoyer la demande').click();
      cy.get(`${orderNameInput}:invalid`).should('exist');
      cy.get(orderNameInput).then(($input) => {
        expect($input[0].checkValidity()).to.be.false;
      });
    });

    it('should prevent submission if no Sujet is selected', () => {
      cy.get(orderNameInput).type('No Subject Test');
      cy.get(orderNumberInput).type('ORD67890');
      cy.get(orderEmailInput).type('test.nosubject@example.com');
      cy.get(orderMessageTextarea).type('Trying to submit with no subject selected.');
      cy.contains(orderSubmitButton, 'Envoyer la demande').click();
      cy.get(`${orderSubjectSelect}:invalid`).should('exist');
      cy.get(orderSubjectSelect).then(($select) => {
        expect($select[0].checkValidity()).to.be.false;
      });
    });
  });

  // Tests for the Checkout Forms
  context('Checkout Forms', () => {
    const productToCheckout = {
      id: 100, 
      name: 'Checkout Test Item',
      price: 25.00, // The price for dynamic button text "Payer X €"
      images: ['checkout_item.jpg'],
      category: 'Checkout Category',
      description: 'An item to test checkout.',
      additionalInfo: 'Info for checkout test item.',
      reviews: [],
      details: 'Details for checkout test item.',
      care: 'Care for checkout test item.',
      artisan: 'Artisan for checkout test item.',
      artisanStory: 'Artisan story for checkout test item.'
    };

    // Step 1 selectors
    const coordsFirstNameInput = 'input#firstName';
    const coordsLastNameInput = 'input#lastName';
    const coordsEmailInput = 'input#email';
    const coordsPhoneInput = 'input#phone';
    const continueToDeliveryButtonText = 'Continuer vers la livraison';

    // Step 2 selectors
    const deliveryAddressInput = 'input#address';
    const deliveryAddressComplementInput = 'input#addressComplement';
    const deliveryPostalCodeInput = 'input#postalCode';
    const deliveryCityInput = 'input#city';
    const deliveryCountrySelect = 'select#country';
    const continueToPaymentButtonText = 'Continuer vers le paiement';
    
    // Step 3 selectors
    const cardPaymentMethodRadio = 'input#card';
    const paypalPaymentMethodRadio = 'input#paypal';
    const cardNumberInput = 'input#cardNumber';
    const cardExpiryInput = 'input#expiry';
    const cardCvcInput = 'input#cvc';
    const cardNameInput = 'input#nameOnCard';
    // Dynamic text, so use contains
    const payButtonSelector = 'button[type="submit"]'; 

    function fillStep1Valid() {
      cy.get(coordsFirstNameInput).clear().type('Testy');
      cy.get(coordsLastNameInput).clear().type('McTestFace');
      cy.get(coordsEmailInput).clear().type('testy@example.com');
      cy.get(coordsPhoneInput).clear().type('0123456789');
      cy.contains('button', continueToDeliveryButtonText).click();
      cy.contains('h2', 'Adresse de Livraison').should('be.visible');
    }
    
    function clearStep2Fields() {
        cy.get(deliveryAddressInput).clear();
        cy.get(deliveryAddressComplementInput).clear();
        cy.get(deliveryPostalCodeInput).clear();
        cy.get(deliveryCityInput).clear();
    }

    function fillStep2Valid() {
      cy.get(deliveryAddressInput).clear().type('123 Main St');
      cy.get(deliveryAddressComplementInput).clear().type('Apt 4B'); // Optional
      cy.get(deliveryPostalCodeInput).clear().type('75001'); // Valid French postal code
      cy.get(deliveryCityInput).clear().type('Paris');
      cy.get(deliveryCountrySelect).select('FR');
      cy.contains('button', continueToPaymentButtonText).click();
      cy.contains('h2', 'Méthode de Paiement').should('be.visible'); // Verify Step 3 is active
    }

    beforeEach(() => {
      cy.then(() => Cypress.Promise.try(() => mockApiService.addToCart(productToCheckout, 1)));
      cy.visit('/checkout');
      cy.contains('h2', 'Vos Coordonnées').should('be.visible');
    });

    // --- Step 1: Vos Coordonnées ---
    it('should allow valid data submission for Step 1 and proceed to Step 2', () => {
      fillStep1Valid(); 
    });

    it('should show error toast for missing required fields in Step 1', () => {
      const expectedToastMessage = 'Veuillez remplir tous les champs obligatoires.';
      cy.get(coordsLastNameInput).type('TestLastName');
      cy.get(coordsEmailInput).type('test@example.com');
      cy.get(coordsPhoneInput).type('0987654321');
      cy.contains('button', continueToDeliveryButtonText).click();
      cy.get('div[role="status"]').should('contain.text', expectedToastMessage);
      cy.contains('h2', 'Vos Coordonnées').should('be.visible'); 
      cy.contains('h2', 'Adresse de Livraison').should('not.exist'); 
      cy.get(coordsLastNameInput).clear(); cy.get(coordsEmailInput).clear(); cy.get(coordsPhoneInput).clear();

      cy.get(coordsFirstNameInput).type('TestFirstName');
      cy.get(coordsEmailInput).type('test@example.com');
      cy.get(coordsPhoneInput).type('0987654321');
      cy.contains('button', continueToDeliveryButtonText).click();
      cy.get('div[role="status"]').should('contain.text', expectedToastMessage);
      cy.contains('h2', 'Vos Coordonnées').should('be.visible');
      cy.contains('h2', 'Adresse de Livraison').should('not.exist');
      cy.get(coordsFirstNameInput).clear(); cy.get(coordsEmailInput).clear(); cy.get(coordsPhoneInput).clear();

      cy.get(coordsFirstNameInput).type('TestFirstName');
      cy.get(coordsLastNameInput).type('TestLastName');
      cy.get(coordsPhoneInput).type('0987654321');
      cy.contains('button', continueToDeliveryButtonText).click();
      cy.get('div[role="status"]').should('contain.text', expectedToastMessage);
      cy.contains('h2', 'Vos Coordonnées').should('be.visible');
      cy.contains('h2', 'Adresse de Livraison').should('not.exist');
    });

    it('should show error toast for invalid email format in Step 1', () => {
      cy.get(coordsFirstNameInput).type('TestFirstName');
      cy.get(coordsLastNameInput).type('TestLastName');
      cy.get(coordsEmailInput).type('invalid-email'); 
      cy.get(coordsPhoneInput).type('1122334455');
      cy.contains('button', continueToDeliveryButtonText).click();
      cy.get('div[role="status"]').should('contain.text', 'Veuillez entrer une adresse email valide.');
      cy.contains('h2', 'Vos Coordonnées').should('be.visible'); 
      cy.contains('h2', 'Adresse de Livraison').should('not.exist'); 
    });

    // --- Step 2: Adresse de Livraison ---
    it('should allow valid data submission for Step 2 and proceed to Step 3', () => {
      fillStep1Valid(); 
      fillStep2Valid();
    });

    it('should show error toast for missing required fields in Step 2', () => {
      const expectedToastMessage = 'Veuillez remplir tous les champs obligatoires.';
      fillStep1Valid();
      cy.get(deliveryAddressComplementInput).type('Suite 100');
      cy.get(deliveryPostalCodeInput).type('75002');
      cy.get(deliveryCityInput).type('Paris');
      cy.get(deliveryCountrySelect).select('FR');
      cy.contains('button', continueToPaymentButtonText).click();
      cy.get('div[role="status"]').should('contain.text', expectedToastMessage);
      cy.contains('h2', 'Adresse de Livraison').should('be.visible');
      cy.contains('h2', 'Méthode de Paiement').should('not.exist');
      clearStep2Fields(); 

      fillStep1Valid(); 
      cy.get(deliveryAddressInput).type('456 Avenue Secondaire');
      cy.get(deliveryCityInput).type('Lyon');
      cy.get(deliveryCountrySelect).select('FR');
      cy.contains('button', continueToPaymentButtonText).click();
      cy.get('div[role="status"]').should('contain.text', expectedToastMessage);
      cy.contains('h2', 'Adresse de Livraison').should('be.visible');
      cy.contains('h2', 'Méthode de Paiement').should('not.exist');
      clearStep2Fields();

      fillStep1Valid();
      cy.get(deliveryAddressInput).type('789 Boulevard Tertiaire');
      cy.get(deliveryPostalCodeInput).type('13001');
      cy.get(deliveryCountrySelect).select('FR');
      cy.contains('button', continueToPaymentButtonText).click();
      cy.get('div[role="status"]').should('contain.text', expectedToastMessage);
      cy.contains('h2', 'Adresse de Livraison').should('be.visible');
      cy.contains('h2', 'Méthode de Paiement').should('not.exist');
    });
    
    it('should show error toast for invalid French postal code in Step 2', () => {
      fillStep1Valid(); 
      cy.get(deliveryAddressInput).type('101 Rue de Test');
      cy.get(deliveryCityInput).type('Quelqueville');
      cy.get(deliveryCountrySelect).select('FR'); 
      cy.get(deliveryPostalCodeInput).type('123'); 
      cy.contains('button', continueToPaymentButtonText).click();
      cy.get('div[role="status"]').should('contain.text', 'Veuillez entrer un code postal français valide (5 chiffres)');
      cy.contains('h2', 'Adresse de Livraison').should('be.visible'); 
      cy.contains('h2', 'Méthode de Paiement').should('not.exist'); 
    });

    // --- Step 3: Méthode de Paiement ---
    // Test Case 16: Successful simulated payment with Card details
    it('should simulate successful payment with Card details', () => {
      fillStep1Valid();
      fillStep2Valid();

      cy.get(cardPaymentMethodRadio).check().should('be.checked'); // Ensure card is selected

      cy.get(cardNumberInput).type('1234567890123456');
      cy.get(cardExpiryInput).type('12/25');
      cy.get(cardCvcInput).type('123');
      cy.get(cardNameInput).type('Test Cardholder');

      // Construct the expected button text using the product's price
      const expectedPayButtonText = `Payer ${productToCheckout.price.toFixed(2).replace('.', ',')} €`;
      const payButton = cy.contains(payButtonSelector, expectedPayButtonText);
      payButton.should('be.visible').click();

      // Assert button text changes to "Traitement en cours..."
      cy.contains(payButtonSelector, 'Traitement en cours...').should('be.visible');
      // Or check if it's disabled
      // cy.contains(payButtonSelector, 'Traitement en cours...').should('be.disabled');

      // Assert success toast
      cy.get('div[role="status"]', { timeout: 2000 }) // Wait a bit longer for the toast
        .should('be.visible')
        .and('contain.text', 'Paiement traité avec succès');
      
      // Assert button text reverts or button becomes disabled after timeout
      // The timeout in Checkout.tsx is 1500ms for the processing simulation
      cy.contains(payButtonSelector, expectedPayButtonText, { timeout: 2000 })
        .should('be.visible')
        .and('not.contain.text', 'Traitement en cours...');
      // Or check if it's re-enabled if it was disabled
      // cy.contains(payButtonSelector, expectedPayButtonText).should('not.be.disabled');
    });

    // Test Case 17: Test selecting PayPal
    it('should hide card fields when PayPal is selected', () => {
      fillStep1Valid();
      fillStep2Valid();

      cy.get(paypalPaymentMethodRadio).check().should('be.checked');

      // Assert card input fields are not visible
      cy.get(cardNumberInput).should('not.exist'); // Or .should('not.be.visible') if they are hidden not removed
      cy.get(cardExpiryInput).should('not.exist');
      cy.get(cardCvcInput).should('not.exist');
      cy.get(cardNameInput).should('not.exist');

      // Assert "Payer X €" button is still present (text might change for PayPal)
      // For this test, just checking the button exists is enough.
      // The text might change to "Payer avec PayPal" or similar.
      cy.contains(payButtonSelector, 'Payer').should('be.visible');
    });
  });
});
