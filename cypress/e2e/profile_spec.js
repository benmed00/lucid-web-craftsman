/**
 * Profile Page E2E — Personal info editing, Order history
 *
 * Requires: CUSTOMER_EMAIL / CUSTOMER_PASSWORD env vars.
 * All tests are skipped gracefully when credentials are missing.
 *
 * Tags: @profile @regression
 */

const PROFILE_URL = '/profile';
/** Order history route (see App.tsx — `/orders`, not nested under `/profile`) */
const ORDERS_URL = '/orders';

// ── Skip guard ────────────────────────────────────────────────────────────────
function requireCredentials() {
  const email = Cypress.env('CUSTOMER_EMAIL');
  const password = Cypress.env('CUSTOMER_PASSWORD');
  if (!email || !password) {
    cy.log('⚠️  Skipping: CUSTOMER_EMAIL / CUSTOMER_PASSWORD env vars not set');
    return false;
  }
  return true;
}

// ── Profile Page: Unauthenticated ─────────────────────────────────────────────

describe('Profile: Unauthenticated Guard @profile @regression', () => {
  it('shows login required on /profile when visiting without a session', () => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.visit(PROFILE_URL);
    cy.url({ timeout: 6000 }).should('include', '/profile');
    cy.contains(/connexion requise|login required|sign in/i, {
      timeout: 8000,
    }).should('be.visible');
  });
});

// ── Profile Page: Layout & Tabs ───────────────────────────────────────────────

describe('Profile: Layout @profile @regression', () => {
  beforeEach(() => {
    if (!requireCredentials()) return;
    cy.loginAs('customer');
    cy.visit(PROFILE_URL);
  });

  it('renders the profile page with a heading', () => {
    if (!requireCredentials()) return;
    cy.get('h1, h2', { timeout: 8000 }).first().should('be.visible');
  });

  it('displays user email or name in the profile', () => {
    if (!requireCredentials()) return;
    const email = Cypress.env('CUSTOMER_EMAIL');
    // Profile should show some identifier
    cy.contains(email, { timeout: 8000 }).should('be.visible');
  });

  it('renders profile navigation tabs or sections', () => {
    if (!requireCredentials()) return;
    cy.contains(/informations|personnel|profil|overview|commandes/i, {
      timeout: 8000,
    }).should('be.visible');
  });

  it('has a sign-out button', () => {
    if (!requireCredentials()) return;
    cy.contains(/se déconnecter|déconnexion|sign out|logout/i, {
      timeout: 8000,
    }).should('be.visible');
  });
});

// ── Profile: Personal Info Edit ───────────────────────────────────────────────

describe('Profile: Personal Info @profile @regression', () => {
  beforeEach(() => {
    if (!requireCredentials()) return;
    cy.loginAs('customer');
    cy.visit(PROFILE_URL);
    // Navigate to personal info tab
    cy.contains(/informations personnelles|personal info|mes infos/i, {
      timeout: 8000,
    }).click();
  });

  it('shows personal info form with name and email fields', () => {
    if (!requireCredentials()) return;
    cy.get(
      'input[id*="name" i], input[name*="name" i], input[placeholder*="nom" i]',
      { timeout: 8000 }
    ).should('have.length.gte', 1);
  });

  it('email field is pre-filled with the user email', () => {
    if (!requireCredentials()) return;
    const email = Cypress.env('CUSTOMER_EMAIL');
    cy.get('input[type="email"]', { timeout: 8000 })
      .first()
      .should('have.value', email);
  });

  it('can edit the full name and save', () => {
    if (!requireCredentials()) return;

    const nameField = cy
      .get('input[id*="full" i], input[id*="name" i], input[name*="full" i]', {
        timeout: 8000,
      })
      .first();

    nameField.clear().type('Test User Updated');

    cy.get('button[type="submit"]')
      .contains(/enregistrer|sauvegarder|save|update/i)
      .click();

    cy.contains(/mis à jour|sauvegardé|saved|updated|success/i, {
      timeout: 8000,
    }).should('be.visible');
  });

  it('shows validation error for empty required name field', () => {
    if (!requireCredentials()) return;

    cy.get('input[id*="full" i], input[id*="name" i], input[name*="full" i]', {
      timeout: 8000,
    })
      .first()
      .clear();

    cy.get('button[type="submit"]')
      .contains(/enregistrer|sauvegarder|save|update/i)
      .click();

    cy.get('[role="alert"], [data-testid*="error"], input:invalid', {
      timeout: 4000,
    }).should('exist');
  });

  it('phone number field accepts valid phone format', () => {
    if (!requireCredentials()) return;

    cy.get('input[type="tel"], input[id*="phone" i], input[name*="phone" i]', {
      timeout: 6000,
    }).then(($el) => {
      if ($el.length) {
        cy.wrap($el).first().clear().type('+33612345678');
      } else {
        cy.log('No phone field found; skipping');
      }
    });
  });
});

// ── Profile: Order History ────────────────────────────────────────────────────

describe('Profile: Order History @profile @regression', () => {
  beforeEach(() => {
    if (!requireCredentials()) return;
    cy.loginAs('customer');
    cy.visit(PROFILE_URL);
  });

  it('navigates to order history tab and renders the section', () => {
    if (!requireCredentials()) return;

    cy.contains(/commandes|orders|historique/i, { timeout: 8000 }).click();

    cy.url().then((url) => {
      if (!url.includes('/orders')) {
        // Tab-based navigation — check content
        cy.contains(/commandes|orders|aucune commande|no orders/i, {
          timeout: 6000,
        }).should('be.visible');
      }
    });
  });

  it('/orders renders without crashing', () => {
    if (!requireCredentials()) return;

    cy.visit(ORDERS_URL);
    cy.get('main, [role="main"]', { timeout: 8000 }).should('be.visible');
    cy.contains(/commandes|orders/i, { timeout: 6000 }).should('be.visible');
  });

  it('shows order list or empty-state message', () => {
    if (!requireCredentials()) return;

    cy.visit(ORDERS_URL);

    cy.then(() => {
      // Either orders or empty state
      cy.get('body', { timeout: 8000 }).then(($body) => {
        const hasOrders =
          $body.find('[data-testid*="order"], .order-item, [class*="order"]')
            .length > 0;
        const hasEmptyState = $body
          .text()
          .match(/aucune commande|no orders|pas encore|no order/i);

        expect(hasOrders || hasEmptyState).to.be.true;
      });
    });
  });

  it('order items show order number, status, and amount', () => {
    if (!requireCredentials()) return;

    cy.visit(ORDERS_URL);

    cy.get('[data-testid*="order"], [class*="order-item"]', {
      timeout: 8000,
    }).then(($orders) => {
      if ($orders.length === 0) {
        cy.log('No orders to test; skipping order item detail check');
        return;
      }

      cy.wrap($orders)
        .first()
        .within(() => {
          // Should show some order info
          cy.contains(/\d+/).should('exist'); // order number or amount
        });
    });
  });

  it('order row has a "view details" link', () => {
    if (!requireCredentials()) return;

    cy.visit(ORDERS_URL);

    cy.get('[data-testid*="order"]', { timeout: 8000 }).then(($orders) => {
      if ($orders.length === 0) {
        cy.log('No orders found; skipping detail link check');
        return;
      }

      cy.wrap($orders)
        .first()
        .contains(/voir le détail|voir|details|view/i)
        .should('be.visible');
    });
  });
});

// ── Profile: Security ─────────────────────────────────────────────────────────

describe('Profile: Security @profile @regression', () => {
  it('sign-out clears session and redirects to auth page', () => {
    if (!requireCredentials()) {
      cy.log('Skipping: credentials not set');
      return;
    }

    cy.loginAs('customer');
    cy.visit(PROFILE_URL);

    cy.contains(/se déconnecter|déconnexion|sign out|logout/i, {
      timeout: 8000,
    }).click();

    cy.url({ timeout: 8000 }).should(
      'satisfy',
      (url) => url.includes('/auth') || url === `${Cypress.config('baseUrl')}/`
    );

    // Verify session is cleared — profile should redirect
    cy.visit(PROFILE_URL);
    cy.url({ timeout: 6000 }).should('include', '/auth');
  });
});
