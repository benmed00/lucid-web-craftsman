/**
 * E2E: When localStorage checkout keys are empty, guest checkout rehydrates
 * `personal_info` / `shipping_info` from `checkout_sessions` (PostgREST).
 *
 * Keeps the existing `guest_session` from add-to-cart so the cart is not orphaned.
 *
 * Tags: @regression
 */

/** Stable guest id for checkout_sessions stub (valid UUID v4). */
const E2E_GUEST_ID = 'aaaaaaaa-bbbb-4ccc-bbbb-bbbbbbbbbbbb';

function seedGuestSession(win: Window) {
  win.localStorage.setItem(
    'guest_session',
    JSON.stringify({
      data: {
        guestId: E2E_GUEST_ID,
        signature: 'e2e-guest-signature',
        createdAt: Date.now(),
        device: { deviceType: 'desktop', os: 'Linux', browser: 'Chrome' },
      },
      timestamp: Date.now(),
    })
  );
}

function clearCheckoutStorageKeys(win: Window) {
  const ls = [
    'checkout_form_data',
    'checkout_timestamp',
    'checkout_current_step',
    'checkout_completed_steps',
  ];
  ls.forEach((k) => win.localStorage.removeItem(k));
  win.sessionStorage.removeItem('checkout_form_data');
  win.sessionStorage.removeItem('checkout_current_step');
  win.sessionStorage.removeItem('checkout_completed_steps');
}

describe('Checkout DB hydration (guest) @regression', () => {
  it('hydrates personal and shipping fields from stubbed checkout_sessions', () => {
    cy.stubProductsCatalog();
    cy.intercept('GET', '**/rest/v1/profiles**', { statusCode: 200, body: [] });
    cy.intercept('GET', '**/rest/v1/shipping_addresses**', {
      statusCode: 200,
      body: [],
    });
    cy.intercept('GET', '**/rest/v1/app_settings*', {
      statusCode: 200,
      body: [],
    });

    const personal = {
      first_name: 'Yasmine',
      last_name: 'Khouildi',
      email: 'yasmine.khouildi@example.com',
      phone: '+33123456789',
    };
    const shipping = {
      address_line1: '42 Rue de la République',
      address_line2: '',
      postal_code: '75001',
      city: 'Paris',
      country: 'FR',
    };

    cy.intercept('GET', '**/rest/v1/checkout_sessions**', (req) => {
      const url = decodeURIComponent(req.url);
      const m = /guest_id=eq\.("?)([^"&]+)\1/.exec(url);
      if (!m) {
        // PostgREST object+json for `.maybeSingle()` when no row
        req.reply({ statusCode: 200, body: null });
        return;
      }
      let guestId = decodeURIComponent(m[2]);
      req.reply({
        statusCode: 200,
        body: {
          id: 'e2e-hydrate-session-1',
          guest_id: guestId,
          user_id: null,
          status: 'in_progress',
          current_step: 1,
          last_completed_step: 0,
          personal_info: personal,
          shipping_info: shipping,
          promo_code: null,
          promo_code_valid: null,
          promo_discount_type: null,
          promo_discount_value: null,
          promo_discount_applied: null,
          promo_free_shipping: false,
          cart_items: null,
          subtotal: 0,
          shipping_cost: 0,
          total: 0,
          order_id: null,
          created_at: new Date().toISOString(),
        },
      });
    }).as('checkoutSessionsHydration');

    cy.visit('/products', {
      onBeforeLoad(win) {
        seedGuestSession(win);
      },
    });
    cy.get('[data-testid="products-catalog"] [id^="add-to-cart-btn-"]', {
      timeout: 25000,
    }).should('have.length.at.least', 1);
    cy.addCatalogLineAndOpenCartSpa();
    cy.window().then((win) => {
      clearCheckoutStorageKeys(win);
    });
    cy.get('#main-content #cart-checkout-button').should('be.visible').click();
    cy.wait('@checkoutSessionsHydration');
    cy.waitForCheckoutCustomerStep({ timeout: 20000 });
    cy.get('#firstName', { timeout: 15000 }).should(
      'have.value',
      personal.first_name
    );
    cy.get('#lastName').should('have.value', personal.last_name);
    cy.get('#email').should('have.value', personal.email);
    cy.get('#phone').should('have.value', personal.phone);

    cy.get('[data-testid="checkout-continue-to-shipping"]')
      .filter(':visible')
      .click();

    cy.get('#address', { timeout: 15000 }).should('be.visible');
    cy.get('#address').should('have.value', shipping.address_line1);
    cy.get('#postalCode').should('have.value', shipping.postal_code);
    cy.get('#city').should('have.value', shipping.city);
    cy.get('#country').should('have.value', shipping.country);
  });
});
