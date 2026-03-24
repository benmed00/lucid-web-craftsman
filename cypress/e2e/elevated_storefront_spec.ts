/**
 * Elevated storefront (admin-on-shop): cart + wishlist use isolated storage and skip cloud cart sync.
 *
 * Requires ADMIN_* or CUSTOMER_* in Cypress env (see cypress.env.example.json).
 * Stubs `is_admin_user` RPC so policy resolves as elevated without relying on DB role latency.
 *
 * Tags: @elevated @regression
 */

const PRODUCTS_PAGE = '/products';

function readSupabaseUserId(win: Window): string | null {
  for (let i = 0; i < win.localStorage.length; i++) {
    const key = win.localStorage.key(i);
    if (!key || !key.includes('auth-token')) continue;
    try {
      const raw = win.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as {
        user?: { id?: string };
        currentSession?: { user?: { id?: string } };
      };
      const uid = parsed?.user?.id ?? parsed?.currentSession?.user?.id;
      if (typeof uid === 'string' && uid.length > 8) return uid;
    } catch {
      /* ignore */
    }
  }
  return null;
}

describe('Elevated storefront isolation @elevated @regression', () => {
  let syncCartCalls = 0;

  before(() => {
    const hasAdmin =
      Cypress.env('ADMIN_EMAIL') && Cypress.env('ADMIN_PASSWORD');
    const hasCustomer =
      Cypress.env('CUSTOMER_EMAIL') && Cypress.env('CUSTOMER_PASSWORD');
    if (!hasAdmin && !hasCustomer) {
      Cypress.env('SKIP_ELEVATED_STORE', true);
    }
  });

  beforeEach(function () {
    if (Cypress.env('SKIP_ELEVATED_STORE')) {
      this.skip();
    }
    syncCartCalls = 0;
    cy.stubProductsCatalog();
    cy.stubElevatedStorefrontRpcs();
    cy.intercept('POST', '**/rest/v1/rpc/sync_cart', (req) => {
      syncCartCalls += 1;
      req.reply({ statusCode: 200, body: null });
    }).as('syncCartRpc');

    if (Cypress.env('ADMIN_EMAIL') && Cypress.env('ADMIN_PASSWORD')) {
      cy.loginAs('admin');
    } else {
      cy.loginAs('customer');
    }

    cy.visit(PRODUCTS_PAGE);
    cy.window().then((win) => {
      win.localStorage.removeItem('cart-storage');
      win.localStorage.removeItem('cart-storage-elevated');
      for (let i = win.sessionStorage.length - 1; i >= 0; i--) {
        const k = win.sessionStorage.key(i);
        if (k?.startsWith('cart_sync_policy_v1:')) {
          win.sessionStorage.removeItem(k);
        }
      }
      const uid = readSupabaseUserId(win);
      if (uid) {
        win.localStorage.removeItem(`wishlist-elevated-ids:${uid}`);
      }
    });
    cy.reload();
  });

  it('persists cart under cart-storage-elevated and does not call sync_cart', () => {
    cy.visit(PRODUCTS_PAGE, { timeout: 30000 });
    cy.addProductToCart({ productId: 1 });

    cy.window().should((win) => {
      const elevated = win.localStorage.getItem('cart-storage-elevated');
      expect(elevated, 'cart-storage-elevated').to.be.a('string');
      expect(elevated!.length).to.be.greaterThan(2);
      const plain = win.localStorage.getItem('cart-storage');
      if (plain) {
        const parsed = JSON.parse(plain) as { state?: { items?: unknown[] } };
        expect(
          parsed?.state?.items?.length ?? 0,
          'customer cart-storage should stay empty for elevated'
        ).to.eq(0);
      }
    });

    cy.then(() => {
      expect(syncCartCalls, 'sync_cart RPC should not run for elevated').to.eq(
        0
      );
    });
  });

  it('stores wishlist ids under wishlist-elevated-ids:<userId>', () => {
    cy.visit(PRODUCTS_PAGE, { timeout: 30000 });

    cy.window().should((win) => {
      expect(readSupabaseUserId(win), 'Supabase session user id').to.be.a(
        'string'
      );
    });

    cy.get('[id^="wishlist-btn-"]', { timeout: 15000 })
      .first()
      .find('button')
      .click({ force: true });

    cy.contains(/ajouté aux favoris|added to wishlist|favoris/i, {
      timeout: 12000,
    }).should('be.visible');

    cy.window().then((win) => {
      const uid = readSupabaseUserId(win);
      expect(uid).to.be.a('string');
      const key = `wishlist-elevated-ids:${uid}`;
      const raw = win.localStorage.getItem(key);
      expect(raw, key).to.be.a('string');
      const parsed = JSON.parse(raw!) as unknown;
      expect(Array.isArray(parsed)).to.eq(true);
      expect((parsed as number[]).length).to.be.greaterThan(0);
    });
  });
});
