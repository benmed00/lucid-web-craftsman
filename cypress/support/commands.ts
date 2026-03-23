import type { Method, StaticResponse } from 'cypress/types/net-stubbing';

type MockScenario =
  | 'success'
  | 'error400'
  | 'error401'
  | 'error403'
  | 'error404'
  | 'error500'
  | 'errorTimeout'
  | 'invalidPayload'
  | 'latency';

// Tab key press for keyboard navigation tests (uses cypress-real-events)
Cypress.Commands.add('tab', { prevSubject: ['optional'] }, (_subject) => {
  return cy.realPress('Tab');
});

Cypress.Commands.add('addProductToCart', (options?: { productId?: number }) => {
  cy.visit('/products');
  const id = options?.productId;
  if (id != null) {
    cy.get(`#add-to-cart-btn-${id}`).should('be.visible').click();
    return;
  }
  cy.get('[id^="add-to-cart-btn-"]').first().should('be.visible').click();
});

/** Supabase stubs so checkout page loads quickly (shared by checkout_flow_spec + enterprise smoke). */
Cypress.Commands.add('stubCheckoutIntercepts', () => {
  // Match PostgREST URLs with ?select=... (query string after base path)
  cy.intercept('GET', '**/rest/v1/checkout_sessions**', {
    statusCode: 200,
    body: [],
  }).as('checkoutSessionsGet');
  cy.intercept('GET', '**/rest/v1/app_settings*', {
    statusCode: 200,
    body: [],
  }).as('appSettings');
});

Cypress.Commands.add('resetDatabase', () => {
  const url = Cypress.env('DB_RESET_URL') as string | undefined;
  const token = Cypress.env('DB_RESET_TOKEN') as string | undefined;
  if (!url) {
    cy.clearCookies();
    cy.clearLocalStorage();
    return;
  }
  cy.request({
    method: 'POST',
    url,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    failOnStatusCode: true,
  });
});

/**
 * Log in via /auth and cache the session with cy.session().
 * Set CUSTOMER_EMAIL / CUSTOMER_PASSWORD (or ADMIN_*) in Cypress env.
 */
Cypress.Commands.add('loginAs', (role: 'customer' | 'admin' = 'customer') => {
  const email = Cypress.env(`${role.toUpperCase()}_EMAIL`) as string;
  const password = Cypress.env(`${role.toUpperCase()}_PASSWORD`) as string;
  cy.session(
    [role, email],
    () => {
      cy.visit('/auth');
      cy.get('#signin-email').clear().type(email);
      cy.get('#signin-password').clear().type(password, { log: false });
      cy.get('button[type="submit"]')
        .contains(/se connecter|sign in/i)
        .click();
      cy.url().should('not.include', '/auth');
    },
    {
      validate() {
        cy.visit('/profile');
        cy.url().should('not.include', '/auth');
      },
    }
  );
});

Cypress.Commands.add(
  'mockSupabaseResponse',
  (method: Method, path: string, scenario: MockScenario, body?: unknown) => {
    const toGlob = (p: string) => {
      // Match PostgREST: .../rest/v1/products?select=... (glob * covers ?query)
      if (p === '/products') return '**/rest/v1/products*';
      if (p === '/product_translations')
        return '**/rest/v1/product_translations*';
      if (p === '/orders') return '**/rest/v1/orders*';
      if (p === '/profiles') return '**/rest/v1/profiles*';
      if (p === '/product_reviews') return '**/rest/v1/product_reviews*';
      if (p === '/cart_items') return '**/rest/v1/cart_items*';
      if (p === '/blog_posts') return '**/rest/v1/blog_posts*';
      if (p === '/app_settings') return '**/rest/v1/app_settings*';
      if (p.startsWith('/rpc/')) return `**/rest/v1${p}*`;
      if (p.startsWith('/functions/')) return `**${p}*`;
      return `**${p}*`;
    };

    const reply = () => {
      switch (scenario) {
        case 'success':
          return { statusCode: 200, body };
        case 'invalidPayload':
          return { statusCode: 200, body: { invalid: true } };
        case 'error400':
          return { statusCode: 400, body: { message: 'Bad Request (mocked)' } };
        case 'error401':
          return {
            statusCode: 401,
            body: { message: 'Unauthorized (mocked)' },
          };
        case 'error403':
          return { statusCode: 403, body: { message: 'Forbidden (mocked)' } };
        case 'error404':
          return { statusCode: 404, body: { message: 'Not Found (mocked)' } };
        case 'error500':
          return {
            statusCode: 500,
            body: { message: 'Server Error (mocked)' },
          };
        case 'latency':
          // Empty `body` breaks PostgREST JSON; use fixture so Products page can render cards after delay
          return {
            statusCode: 200,
            delay: 2000,
            fixture: 'supabase/products-latency.json',
          };
        case 'errorTimeout':
          return { forceNetworkError: true as const };
      }
    };

    cy.intercept(method, toGlob(path), (req) => {
      req.reply(reply() as StaticResponse);
    }).as(`mock:${method}:${path}:${scenario}`);
  }
);

declare global {
  /* eslint-disable @typescript-eslint/no-namespace -- Cypress Chainable augmentation requires namespace */
  namespace Cypress {
    interface Chainable {
      tab(): Chainable<unknown>;
      addProductToCart(options?: { productId?: number }): Chainable<void>;
      stubCheckoutIntercepts(): Chainable<void>;
      resetDatabase(): Chainable<void>;
      loginAs(role?: 'customer' | 'admin'): Chainable<void>;
      mockSupabaseResponse(
        method: Method,
        path: string,
        scenario: MockScenario,
        body?: unknown
      ): Chainable<void>;
    }
  }
}
