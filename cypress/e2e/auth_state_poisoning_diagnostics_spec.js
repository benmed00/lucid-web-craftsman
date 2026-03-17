/**
 * Diagnostic E2E suite for client-state poisoning and stale JWT behavior.
 *
 * Goal: prove whether local auth state can poison public queries, and whether
 * the app exits infinite loading states with usable recovery.
 *
 * Tags: @diagnostic @regression
 */

const AUTH_KEY = 'sb-xcvlijchkmhjonhfildm-auth-token';

const seededProducts = [
  {
    id: 9101,
    name: 'Diagnostic Basket',
    description: 'Seeded product for auth poisoning diagnostics',
    short_description: 'Diagnostic basket',
    price: 49.9,
    images: ['https://images.unsplash.com/photo-1473448912268-2022ce9509d8'],
    category: 'Diagnostics',
    artisan: 'Test Artisan',
    details: 'Diagnostic details',
    care: 'Diagnostic care',
    artisan_story: 'Diagnostic story',
    is_new: false,
    is_available: true,
    is_active: true,
    is_featured: true,
    stock_quantity: 20,
    min_stock_level: 2,
    material: 'straw',
    color: 'natural',
    dimensions_cm: '30x20x10',
    weight_grams: 500,
    rating_average: 4.8,
    rating_count: 25,
    slug: 'diagnostic-basket',
    related_products: [],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    product_translations: [
      {
        locale: 'fr',
        name: 'Panier diagnostic',
        description: 'Produit de diagnostic pour tests E2E',
        short_description: 'Panier de diagnostic',
        details: 'Détails diagnostic',
        care: 'Entretien diagnostic',
        artisan_story: 'Histoire diagnostic',
        seo_title: null,
        seo_description: null,
      },
      {
        locale: 'en',
        name: 'Diagnostic Basket',
        description: 'Diagnostic product for E2E tests',
        short_description: 'Diagnostic basket',
        details: 'Diagnostic details',
        care: 'Diagnostic care',
        artisan_story: 'Diagnostic story',
        seo_title: null,
        seo_description: null,
      },
    ],
  },
];

describe('Auth state poisoning diagnostics @diagnostic @regression', () => {
  it('clears Supabase auth keys after 401 and recovers on next fetch', () => {
    let productsCallCount = 0;

    cy.intercept('GET', '**/rest/v1/products*', (req) => {
      productsCallCount += 1;

      if (productsCallCount === 1) {
        req.reply({
          statusCode: 401,
          body: { message: 'JWT expired or invalid (diagnostic)' },
        });
        return;
      }

      req.reply({
        statusCode: 200,
        body: seededProducts,
      });
    }).as('products');

    cy.visit('/products', {
      onBeforeLoad(win) {
        win.localStorage.setItem(
          AUTH_KEY,
          JSON.stringify({ access_token: 'poisoned.jwt.token' })
        );
        win.localStorage.setItem('cart-storage', '{"items":[42]}');
        win.localStorage.setItem('cloud-instance-preview', 'keep');
      },
    });

    cy.wait('@products').its('response.statusCode').should('eq', 401);
    cy.wait('@products').its('response.statusCode').should('eq', 200);

    cy.window().then((win) => {
      expect(win.localStorage.getItem(AUTH_KEY)).to.eq(null);
      expect(win.localStorage.getItem('cart-storage')).to.not.eq(null);
      expect(win.localStorage.getItem('cloud-instance-preview')).to.eq('keep');
    });

    cy.get('[id^="product-card-"]', { timeout: 20000 }).should(
      'have.length.at.least',
      1
    );
  });

  it('shows retry/error UI instead of infinite skeleton when 401 persists', () => {
    cy.intercept('GET', '**/rest/v1/products*', {
      statusCode: 401,
      body: { message: 'Persistent invalid JWT (diagnostic)' },
    }).as('products401');

    cy.visit('/products', {
      onBeforeLoad(win) {
        win.localStorage.setItem(
          AUTH_KEY,
          JSON.stringify({ access_token: 'always-bad-token' })
        );
      },
    });

    cy.wait('@products401');
    cy.contains('button', /retry|réessayer/i, { timeout: 18000 }).should(
      'be.visible'
    );
    cy.get('[id^="product-card-"]').should('not.exist');

    cy.contains('button', /retry|réessayer/i).click();
    cy.wait('@products401');
  });

  it('mirrors preview symptom: polluted context fails, clean context succeeds', () => {
    cy.intercept('GET', '**/rest/v1/products*', {
      statusCode: 401,
      body: { message: 'Poisoned context (diagnostic)' },
    }).as('productsPoisoned');

    cy.visit('/products', {
      onBeforeLoad(win) {
        win.localStorage.setItem(
          AUTH_KEY,
          JSON.stringify({ access_token: 'context-poison-token' })
        );
      },
    });

    cy.wait('@productsPoisoned');
    cy.contains('button', /retry|réessayer/i, { timeout: 18000 }).should(
      'be.visible'
    );

    cy.then(() => {
      cy.intercept('GET', '**/rest/v1/products*', {
        statusCode: 200,
        body: seededProducts,
      }).as('productsClean');
    });

    cy.clearLocalStorage();
    cy.reload();

    cy.wait('@productsClean').its('response.statusCode').should('eq', 200);
    cy.get('[id^="product-card-"]', { timeout: 20000 }).should(
      'have.length.at.least',
      1
    );
  });
});
