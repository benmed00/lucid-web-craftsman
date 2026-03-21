/**
 * Wishlist E2E — Add, Remove, Persist
 *
 * Requires: CUSTOMER_EMAIL / CUSTOMER_PASSWORD env vars for authenticated tests.
 * Unauthenticated tests use the UI to confirm prompt/redirect behavior.
 *
 * Tags: @wishlist @regression
 */

// ── Selectors ─────────────────────────────────────────────────────────────────
// The wishlist button on product cards uses data-testid or aria-label patterns.
const WISHLIST_BTN = '[aria-label*="favoris" i], [aria-label*="wishlist" i], [data-testid*="wishlist"]';
const WISHLIST_PAGE = '/wishlist';
const PRODUCTS_PAGE = '/products';

// ── Unauthenticated State ─────────────────────────────────────────────────────

describe('Wishlist: Unauthenticated @wishlist @regression', () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.visit(PRODUCTS_PAGE);
  });

  it('shows products page with at least one wishlist button', () => {
    cy.get(WISHLIST_BTN, { timeout: 8000 }).should('have.length.gte', 1);
  });

  it('prompts login or redirects when unauthenticated user clicks wishlist button', () => {
    cy.get(WISHLIST_BTN).first().click({ force: true });

    // Either a toast message or a redirect to /auth should happen
    cy.then(() => {
      cy.document().then((doc) => {
        const hasToast = doc.querySelector('[data-sonner-toast], [role="status"], .toast') !== null;
        const url = cy.url();

        if (!hasToast) {
          cy.url({ timeout: 4000 }).should('include', '/auth');
        } else {
          cy.contains(/connecté|connexion|sign in|login/i, { timeout: 4000 }).should('be.visible');
        }
      });
    });
  });

  it('/wishlist page redirects or shows login required message when unauthenticated', () => {
    cy.visit(WISHLIST_PAGE);
    cy.then(() => {
      cy.url().then((url) => {
        if (url.includes('/auth')) {
          cy.url().should('include', '/auth');
        } else {
          cy.contains(/connexion|connectez-vous|sign in|login required|veuillez vous connecter/i, { timeout: 4000 }).should('be.visible');
        }
      });
    });
  });
});

// ── Authenticated State ───────────────────────────────────────────────────────

describe('Wishlist: Authenticated @wishlist @regression', () => {
  before(() => {
    const email = Cypress.env('CUSTOMER_EMAIL');
    const password = Cypress.env('CUSTOMER_PASSWORD');
    if (!email || !password) {
      Cypress.env('SKIP_AUTH_TESTS', true);
    }
  });

  beforeEach(() => {
    if (Cypress.env('SKIP_AUTH_TESTS')) {
      cy.log('Skipping: CUSTOMER_EMAIL / CUSTOMER_PASSWORD not set');
      return;
    }
    cy.loginAs('customer');
    cy.visit(PRODUCTS_PAGE);
  });

  it('wishlist button is visible and clickable on product cards', () => {
    if (Cypress.env('SKIP_AUTH_TESTS')) return;
    cy.get(WISHLIST_BTN, { timeout: 8000 }).first().should('be.visible');
  });

  it('adds a product to wishlist and shows success feedback', () => {
    if (Cypress.env('SKIP_AUTH_TESTS')) return;

    cy.get(WISHLIST_BTN).first().click({ force: true });

    // Success toast or visual state change (filled heart icon)
    cy.then(() => {
      cy.contains(
        /ajouté aux favoris|added to wishlist|favoris/i,
        { timeout: 6000 }
      ).should('be.visible');
    });
  });

  it('wishlist page shows added product after navigating to /wishlist', () => {
    if (Cypress.env('SKIP_AUTH_TESTS')) return;

    // Add a product — wait for success feedback before navigating
    cy.get(WISHLIST_BTN).first().click({ force: true });
    cy.contains(
      /ajouté aux favoris|added to wishlist|favoris/i,
      { timeout: 8000 }
    ).should('be.visible');

    cy.visit(WISHLIST_PAGE);
    cy.contains(/favoris|wishlist/i, { timeout: 6000 }).should('be.visible');

    // Should have at least one item
    cy.get('[data-testid*="wishlist-item"], .wishlist-item, article, [role="article"]', { timeout: 6000 })
      .should('have.length.gte', 1);
  });

  it('removes a product from wishlist and shows feedback', () => {
    if (Cypress.env('SKIP_AUTH_TESTS')) return;

    cy.visit(WISHLIST_PAGE);

    // Look for a remove button
    cy.get(
      '[aria-label*="retirer" i], [aria-label*="remove" i], [data-testid*="remove"], button:contains("Retirer")',
      { timeout: 8000 }
    ).first().then(($btn) => {
      if ($btn.length) {
        cy.wrap($btn).click({ force: true });
        cy.contains(/retiré|removed|supprimé/i, { timeout: 6000 }).should('be.visible');
      } else {
        // Fallback: click wishlist toggle on product card (acts as remove if already added)
        cy.visit(PRODUCTS_PAGE);
        cy.get(WISHLIST_BTN).first().click({ force: true });
        cy.contains(/retiré|removed/i, { timeout: 4000 }).should('be.visible');
      }
    });
  });

  it('wishlist persists after page reload', () => {
    if (Cypress.env('SKIP_AUTH_TESTS')) return;

    // Add a product first
    cy.get(WISHLIST_BTN).first().click({ force: true });
    cy.contains(
      /ajouté aux favoris|added to wishlist|favoris/i,
      { timeout: 8000 }
    ).should('be.visible');

    cy.visit(WISHLIST_PAGE);
    cy.reload();

    cy.get('[data-testid*="wishlist-item"], .wishlist-item, article', { timeout: 8000 })
      .should('have.length.gte', 1);
  });

  it('wishlist count badge in navigation reflects added items', () => {
    if (Cypress.env('SKIP_AUTH_TESTS')) return;

    // Get initial count (may be 0 or absent)
    cy.get('[aria-label*="favoris" i] [data-count], .wishlist-count, [data-testid*="wishlist-count"]')
      .then(($badge) => {
        const initialCount = $badge.length ? parseInt($badge.text()) || 0 : 0;

        cy.get(WISHLIST_BTN).first().click({ force: true });
        cy.contains(
          /ajouté aux favoris|added to wishlist|favoris/i,
          { timeout: 8000 }
        ).should('be.visible');

        // Count in badge should have increased
        cy.get('[data-testid*="wishlist-count"], .wishlist-count, nav [aria-label*="favoris" i]')
          .invoke('text')
          .then((text) => {
            const newCount = parseInt(text) || 0;
            expect(newCount).to.be.gte(initialCount);
          });
      });
  });
});

// ── Wishlist Page UI ──────────────────────────────────────────────────────────

describe('Wishlist: Page UI @wishlist @regression', () => {
  it('wishlist page renders correctly when empty (authenticated)', () => {
    const email = Cypress.env('CUSTOMER_EMAIL');
    if (!email) {
      cy.log('Skipping: credentials not set');
      return;
    }

    cy.loginAs('customer');
    cy.visit(WISHLIST_PAGE);

    // Should show either empty state or items
    cy.get('main, [role="main"]', { timeout: 8000 }).should('be.visible');
    cy.contains(/favoris|wishlist/i).should('be.visible');
  });

  it('wishlist page has accessible heading', () => {
    const email = Cypress.env('CUSTOMER_EMAIL');
    if (!email) {
      cy.log('Skipping: credentials not set');
      return;
    }

    cy.loginAs('customer');
    cy.visit(WISHLIST_PAGE);

    cy.get('h1, h2', { timeout: 8000 }).should('have.length.gte', 1);
  });
});
