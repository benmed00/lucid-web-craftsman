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
      price: 25.00,
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

    // Helper function to fill Step 1 validly
    function fillStep1Valid() {
      cy.get(coordsFirstNameInput).clear().type('Testy');
      cy.get(coordsLastNameInput).clear().type('McTestFace');
      cy.get(coordsEmailInput).clear().type('testy@example.com');
      cy.get(coordsPhoneInput).clear().type('0123456789');
      cy.contains('button', continueToDeliveryButtonText).click();
      cy.contains('h2', 'Adresse de Livraison').should('be.visible'); // Verify step 2 is active
    }
    
    // Helper function to clear Step 2 fields
    function clearStep2Fields() {
        cy.get(deliveryAddressInput).clear();
        cy.get(deliveryAddressComplementInput).clear();
        cy.get(deliveryPostalCodeInput).clear();
        cy.get(deliveryCityInput).clear();
        // Country select doesn't need clearing in the same way, will be re-selected
    }


    beforeEach(() => {
      cy.then(() => Cypress.Promise.try(() => mockApiService.addToCart(productToCheckout, 1)));
      cy.visit('/checkout');
      cy.contains('h2', 'Vos Coordonnées').should('be.visible');
    });

    // --- Step 1: Vos Coordonnées ---
    it('should allow valid data submission for Step 1 and proceed to Step 2', () => {
      fillStep1Valid(); // Uses the helper
      // Assertion that Step 2 is active is inside fillStep1Valid()
    });

    it('should show error toast for missing required fields in Step 1', () => {
      const expectedToastMessage = 'Veuillez remplir tous les champs obligatoires.';

      // Attempt with firstName empty
      cy.get(coordsLastNameInput).type('TestLastName');
      cy.get(coordsEmailInput).type('test@example.com');
      cy.get(coordsPhoneInput).type('0987654321');
      cy.contains('button', continueToDeliveryButtonText).click();
      cy.get('div[role="status"]').should('contain.text', expectedToastMessage);
      cy.contains('h2', 'Vos Coordonnées').should('be.visible'); 
      cy.contains('h2', 'Adresse de Livraison').should('not.exist'); 
      cy.get(coordsLastNameInput).clear(); cy.get(coordsEmailInput).clear(); cy.get(coordsPhoneInput).clear();

      // Attempt with lastName empty
      cy.get(coordsFirstNameInput).type('TestFirstName');
      cy.get(coordsEmailInput).type('test@example.com');
      cy.get(coordsPhoneInput).type('0987654321');
      cy.contains('button', continueToDeliveryButtonText).click();
      cy.get('div[role="status"]').should('contain.text', expectedToastMessage);
      cy.contains('h2', 'Vos Coordonnées').should('be.visible');
      cy.contains('h2', 'Adresse de Livraison').should('not.exist');
      cy.get(coordsFirstNameInput).clear(); cy.get(coordsEmailInput).clear(); cy.get(coordsPhoneInput).clear();

      // Attempt with email empty
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
    // Test Case 13: Valid data submission for Step 2
    it('should allow valid data submission for Step 2 and proceed to Step 3', () => {
      fillStep1Valid(); // Complete Step 1

      cy.get(deliveryAddressInput).type('123 Rue Principale');
      cy.get(deliveryAddressComplementInput).type('Appartement 4B'); // Optional
      cy.get(deliveryPostalCodeInput).type('75001');
      cy.get(deliveryCityInput).type('Paris');
      cy.get(deliveryCountrySelect).select('FR'); // Select France
      
      cy.contains('button', continueToPaymentButtonText).click();

      // Assert Step 3 ("Méthode de Paiement") is now visible
      cy.contains('h2', 'Méthode de Paiement').should('be.visible');
      // Assert Step 2 ("Adresse de Livraison") might no longer be the primary focus
      cy.contains('h2', 'Adresse de Livraison').should('be.visible'); // Still visible in accordion
    });

    // Test Case 14: Missing required fields for Step 2
    it('should show error toast for missing required fields in Step 2', () => {
      const expectedToastMessage = 'Veuillez remplir tous les champs obligatoires.';
      
      // Sub-case: address empty
      fillStep1Valid();
      // deliveryAddressInput left empty
      cy.get(deliveryAddressComplementInput).type('Suite 100');
      cy.get(deliveryPostalCodeInput).type('75002');
      cy.get(deliveryCityInput).type('Paris');
      cy.get(deliveryCountrySelect).select('FR');
      cy.contains('button', continueToPaymentButtonText).click();
      cy.get('div[role="status"]').should('contain.text', expectedToastMessage);
      cy.contains('h2', 'Adresse de Livraison').should('be.visible');
      cy.contains('h2', 'Méthode de Paiement').should('not.exist');
      clearStep2Fields(); // Clear fields for next sub-case

      // Sub-case: postalCode empty
      fillStep1Valid(); // This re-runs beforeEach and fillStep1, effectively resetting for this sub-case
      cy.get(deliveryAddressInput).type('456 Avenue Secondaire');
      // deliveryPostalCodeInput left empty
      cy.get(deliveryCityInput).type('Lyon');
      cy.get(deliveryCountrySelect).select('FR');
      cy.contains('button', continueToPaymentButtonText).click();
      cy.get('div[role="status"]').should('contain.text', expectedToastMessage);
      cy.contains('h2', 'Adresse de Livraison').should('be.visible');
      cy.contains('h2', 'Méthode de Paiement').should('not.exist');
      clearStep2Fields();

      // Sub-case: city empty
      fillStep1Valid();
      cy.get(deliveryAddressInput).type('789 Boulevard Tertiaire');
      cy.get(deliveryPostalCodeInput).type('13001');
      // deliveryCityInput left empty
      cy.get(deliveryCountrySelect).select('FR');
      cy.contains('button', continueToPaymentButtonText).click();
      cy.get('div[role="status"]').should('contain.text', expectedToastMessage);
      cy.contains('h2', 'Adresse de Livraison').should('be.visible');
      cy.contains('h2', 'Méthode de Paiement').should('not.exist');
    });
    
    // Test Case 15: Invalid French postal code for Step 2
    it('should show error toast for invalid French postal code in Step 2', () => {
      fillStep1Valid(); // Complete Step 1

      cy.get(deliveryAddressInput).type('101 Rue de Test');
      cy.get(deliveryCityInput).type('Quelqueville');
      cy.get(deliveryCountrySelect).select('FR'); // Select France
      cy.get(deliveryPostalCodeInput).type('123'); // Invalid French postal code
      
      cy.contains('button', continueToPaymentButtonText).click();

      cy.get('div[role="status"]').should('contain.text', 'Veuillez entrer un code postal français valide (5 chiffres)');
      cy.contains('h2', 'Adresse de Livraison').should('be.visible'); // Still on Step 2
      cy.contains('h2', 'Méthode de Paiement').should('not.exist'); // Not on Step 3
    });
  });
});
