/**
 * Contact page — exercises the real Edge Function URL (`submit-contact`).
 *
 * The enterprise inventory spec only checks that /contact loads; detailed
 * behaviour (validation + mocked POST) lives here.
 *
 * Run (do **not** call `cypress run` alone unless Vite + mock API are already up on 8080/3001):
 *   npm run e2e:contact
 * or the full suite: npm run e2e:ci
 * A bare `cy.visit('/contact')` → **404** usually means port 8080 is not this app (or dev server off).
 *
 * Tags: @regression (full), @smoke (first test only via grep in CI smoke if desired)
 */

const fillValidContactForm = () => {
  cy.get('#firstName').type('Jean');
  cy.get('#lastName').type('Dupont');
  cy.get('#email').type('jean.dupont@example.com');
  cy.get('#subject').select('product');
  cy.get('#message').type(
    'This is a valid message with more than twenty characters for Cypress.'
  );
};

describe('Contact form (submit-contact) @regression', () => {
  beforeEach(() => {
    cy.visit('/contact');
  });

  it('shows the main fields and submit control @smoke', () => {
    cy.get('#firstName').should('exist');
    cy.get('#lastName').should('exist');
    cy.get('#email').should('exist');
    cy.get('#subject').should('exist');
    cy.get('#message').should('exist');
    cy.get('#contact-form-submit').should('exist');
  });

  it('blocks submit when the message is shorter than 20 characters', () => {
    cy.get('#firstName').type('Test');
    cy.get('#lastName').type('User');
    cy.get('#email').type('test@example.com');
    cy.get('#subject').select('product');
    cy.get('#message').type('Short');
    cy.get('#contact-form-submit').click();
    cy.contains(/20|caractères|characters/i).should('be.visible');
  });

  it('POSTs to functions/v1/submit-contact and shows success when edge returns 200 JSON', () => {
    cy.intercept('POST', '**/functions/v1/submit-contact', {
      statusCode: 200,
      body: {
        success: true,
        message: 'Contact form submitted successfully',
      },
    }).as('submitContact');

    fillValidContactForm();
    cy.get('#contact-form-submit').click();

    cy.wait('@submitContact').then((interception) => {
      expect(interception.request.method).to.eq('POST');
      const raw = interception.request.body;
      const body =
        typeof raw === 'string' && raw.length ? JSON.parse(raw) : raw;
      expect(body).to.include({
        firstName: 'Jean',
        lastName: 'Dupont',
        email: 'jean.dupont@example.com',
        subject: 'product',
      });
      expect(body.message).to.be.a('string').and.have.length.greaterThan(19);
    });

    cy.contains(/Your message has been sent|Votre message a bien été envoyé/i, {
      timeout: 15000,
    }).should('be.visible');

    cy.get('#firstName').should('have.value', '');
    cy.get('#message').should('have.value', '');
  });

  it('surfaces an error toast when submit-contact returns 400', () => {
    cy.intercept('POST', '**/functions/v1/submit-contact', {
      statusCode: 400,
      body: { error: 'Missing required fields' },
    }).as('submitContactFail');

    fillValidContactForm();
    cy.get('#contact-form-submit').click();
    cy.wait('@submitContactFail');
    cy.contains(/HTTP\s*400|400|Bad Request|Échec|failed/i, {
      timeout: 15000,
    }).should('be.visible');
  });
});
