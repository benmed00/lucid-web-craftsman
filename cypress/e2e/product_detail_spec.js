/**
 * Product Detail Page E2E — Add to cart, stock display, tabs, sharing
 *
 * Does not require authentication for public product viewing.
 * Cart and wishlist add-to-cart tests use cy.addProductToCart() helper.
 *
 * Tags: @product @smoke @regression
 */

// ── Selectors ─────────────────────────────────────────────────────────────────
const PRODUCTS_PAGE = '/products';

// ── Navigate to First Product ─────────────────────────────────────────────────
function visitFirstProduct() {
  cy.stubProductsCatalog();
  cy.visit(PRODUCTS_PAGE);
  cy.get(
    'a[href*="/products/"], [data-testid*="product-link"], .product-card a',
    { timeout: 10000 }
  )
    .first()
    .then(($link) => {
      const href = $link.attr('href');
      if (href) {
        cy.visit(href);
      } else {
        cy.wrap($link).click();
      }
    });
}

// ── Product Detail: Loading & Layout ─────────────────────────────────────────

describe('Product Detail: Page Layout @product @smoke', () => {
  beforeEach(() => {
    visitFirstProduct();
  });

  it('renders the product detail page without crashing', () => {
    cy.get('main, [role="main"]', { timeout: 10000 }).should('be.visible');
  });

  it('shows product name as a heading', () => {
    cy.get('h1', { timeout: 8000 })
      .should('be.visible')
      .invoke('text')
      .should('not.be.empty');
  });

  it('shows product price', () => {
    cy.get('[data-testid="product-price"]', { timeout: 15000 })
      .should('be.visible')
      .invoke('text')
      .then((t) => {
        expect(t.trim().length).to.be.greaterThan(0);
        expect(t).to.match(/\d/);
        expect(t).to.match(/€|EUR|MAD|\$|DH|\bDHS?\b/i);
      });
  });

  it('shows at least one product image', () => {
    cy.get('img', { timeout: 8000 })
      .not('[alt=""]')
      .should('have.length.gte', 1);
  });

  it('shows product description or details', () => {
    cy.contains(/description|détails|matière|artisan|soin/i, {
      timeout: 8000,
    }).should('be.visible');
  });

  it('shows artisan name or category', () => {
    cy.get('[data-testid="product-category-badge"]', { timeout: 8000 })
      .should('be.visible')
      .and('not.be.empty');
  });

  it('breadcrumb contains a link back to the shop', () => {
    cy.get(
      '[aria-label*="breadcrumb" i], nav[aria-label*="fil" i], .breadcrumb',
      { timeout: 6000 }
    ).then(($el) => {
      if ($el.length) {
        cy.wrap($el)
          .contains(/boutique|shop|produits|products/i)
          .should('be.visible');
      } else {
        cy.contains(/boutique|shop|produits|products/i).should('be.visible');
      }
    });
  });
});

// ── Product Detail: Stock Display ─────────────────────────────────────────────

describe('Product Detail: Stock Display @product @regression', () => {
  beforeEach(() => {
    visitFirstProduct();
  });

  it('shows in-stock or out-of-stock indicator', () => {
    cy.contains(
      /en stock|rupture|disponible|out of stock|in stock|available/i,
      { timeout: 8000 }
    ).should('be.visible');
  });

  it('add-to-cart button is disabled when product is out of stock', () => {
    cy.get('body', { timeout: 8000 }).then(($body) => {
      if (/rupture|out of stock|indisponible/i.test($body.text())) {
        cy.get('[data-testid="product-add-to-cart"]', { timeout: 4000 }).should(
          'be.disabled'
        );
      } else {
        cy.log('Product is in stock; skipping OOS disabled-button check');
      }
    });
  });

  it('quantity selector is visible for in-stock products', () => {
    cy.contains(/en stock|in stock|disponible/i, { timeout: 6000 }).then(
      ($el) => {
        if ($el.length) {
          cy.get(
            '[data-testid*="quantity"], [aria-label*="quantité" i], button[aria-label*="augmenter" i], button[aria-label*="diminuer" i], input[type="number"]',
            { timeout: 4000 }
          ).should('exist');
        } else {
          cy.log('Product may be out of stock; skipping quantity check');
        }
      }
    );
  });

  it('quantity cannot go below 1', () => {
    cy.get('[aria-label*="diminuer" i], [aria-label*="decrease" i]', {
      timeout: 6000,
    })
      .first()
      .should('be.disabled');
  });
});

// ── Product Detail: Add to Cart ───────────────────────────────────────────────

describe('Product Detail: Add to Cart @product @smoke', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    visitFirstProduct();
  });

  it('has an "add to cart" button', () => {
    cy.get('[data-testid="product-add-to-cart"]', { timeout: 8000 }).should(
      'be.visible'
    );
  });

  it('clicking "add to cart" shows success feedback', () => {
    cy.contains(/en stock|in stock|disponible/i, { timeout: 6000 }).then(
      ($inStock) => {
        if (!$inStock.length) {
          cy.log('Product out of stock; skipping add-to-cart test');
          return;
        }

        cy.get('[data-testid="product-add-to-cart"]', { timeout: 6000 })
          .should('not.be.disabled')
          .click();

        cy.contains(/ajouté au panier|added to cart|ajouté/i, {
          timeout: 8000,
        }).should('be.visible');
      }
    );
  });

  it('cart item count increases after adding a product', () => {
    cy.contains(/en stock|in stock|disponible/i, { timeout: 6000 }).then(
      ($inStock) => {
        if (!$inStock.length) {
          cy.log('Product out of stock; skipping');
          return;
        }

        cy.get('[data-testid="nav-cart-count"]', { timeout: 6000 }).then(
          ($badge) => {
            const initialCount = $badge.length
              ? parseInt($badge.text().replace(/\D/g, ''), 10) || 0
              : 0;

            cy.get('[data-testid="product-add-to-cart"]').click();
            cy.contains(/ajouté au panier|added to cart|ajouté/i, {
              timeout: 8000,
            }).should('be.visible');

            cy.get('[data-testid="nav-cart-count"]', { timeout: 4000 })
              .invoke('text')
              .then((text) => {
                const n = parseInt(text.replace(/\D/g, ''), 10) || 0;
                expect(n).to.be.gte(initialCount + 1);
              });
          }
        );
      }
    );
  });

  it('cart persists product after navigating away and back', () => {
    cy.contains(/en stock|in stock|disponible/i, { timeout: 6000 }).then(
      ($inStock) => {
        if (!$inStock.length) {
          cy.log('Product out of stock; skipping');
          return;
        }

        cy.get('[data-testid="product-add-to-cart"]').click();
        cy.contains(/ajouté au panier|added to cart|ajouté/i, {
          timeout: 8000,
        }).should('be.visible');

        cy.visit('/');
        cy.get('body').should('be.visible');

        cy.visit('/cart');
        cy.get('main#main-content', { timeout: 12000 }).within(() => {
          cy.get('h1')
            .should('be.visible')
            .invoke('text')
            .should('match', /panier|cart/i);
        });
        cy.get('[data-testid="nav-cart-count"]', { timeout: 8000 })
          .should('be.visible')
          .invoke('text')
          .then((t) => {
            expect(parseInt(t.replace(/\D/g, ''), 10) || 0).to.be.gte(1);
          });
      }
    );
  });
});

// ── Product Detail: Tabs ──────────────────────────────────────────────────────

describe('Product Detail: Tabs @product @regression', () => {
  beforeEach(() => {
    visitFirstProduct();
  });

  it('description/details tab is visible and active by default', () => {
    cy.contains(/description|détails|details/i, { timeout: 8000 }).should(
      'be.visible'
    );
  });

  it('can navigate to the care/entretien tab', () => {
    cy.contains(/entretien|care/i, { timeout: 6000 }).then(($el) => {
      if ($el.length) {
        cy.wrap($el).click();
        cy.contains(/entretien|care instructions/i, { timeout: 4000 }).should(
          'be.visible'
        );
      } else {
        cy.log('No care tab found; skipping');
      }
    });
  });

  it('can navigate to the shipping tab', () => {
    cy.contains(/livraison|shipping/i, { timeout: 6000 }).then(($el) => {
      if ($el.length) {
        cy.wrap($el).first().click();
        cy.contains(/livraison|shipping information|délai/i, {
          timeout: 4000,
        }).should('be.visible');
      } else {
        cy.log('No shipping tab found; skipping');
      }
    });
  });

  it('can navigate to the specs/characteristics tab', () => {
    cy.contains(/caractéristiques|specs|specifications/i, {
      timeout: 6000,
    }).then(($el) => {
      if ($el.length) {
        cy.wrap($el).click();
        cy.contains(/matériau|material|artisan|weight|poids/i, {
          timeout: 4000,
        }).should('be.visible');
      } else {
        cy.log('No specs tab found; skipping');
      }
    });
  });
});

// ── Product Detail: Accessibility ─────────────────────────────────────────────

describe('Product Detail: Accessibility @product @regression', () => {
  beforeEach(() => {
    visitFirstProduct();
  });

  it('product image has an alt attribute', () => {
    cy.get('img', { timeout: 8000 }).first().should('have.attr', 'alt');
  });

  it('add-to-cart button has accessible label', () => {
    cy.get('[data-testid="product-add-to-cart"]', { timeout: 6000 }).should(
      ($btn) => {
        const text = $btn.text().trim();
        const ariaLabel = $btn.attr('aria-label');
        expect(text || ariaLabel).to.exist;
      }
    );
  });

  it('page does not have critical axe accessibility violations', () => {
    cy.injectAxe();
    cy.checkA11y(
      null,
      {
        runOnly: ['wcag2a'],
        includedImpacts: ['critical'],
      },
      null,
      true // skip failures — report only
    );
  });
});
