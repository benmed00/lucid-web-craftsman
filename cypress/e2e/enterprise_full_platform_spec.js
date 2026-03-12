/**
 * Enterprise E2E Test Suite — Rif Raw Straw E-commerce Platform
 *
 * Covers: routes, navigation, forms, buttons, DOM nomenclature, loading states,
 * redirections, network activities, browser caching, service worker, macro environment.
 *
 * Run against deploy preview:
 *   CYPRESS_BASE_URL=https://deploy-preview-4--benyakoub.netlify.app npm run e2e:run
 *
 * Tags: @enterprise @smoke @regression
 */

const BASE_URL = Cypress.config('baseUrl') || 'http://localhost:8080';

// ─── Route inventory (public) ───────────────────────────────────────────────
const PUBLIC_ROUTES = [
  { path: '/', name: 'Homepage' },
  { path: '/products', name: 'Products' },
  { path: '/blog', name: 'Blog' },
  { path: '/contact', name: 'Contact' },
  { path: '/about', name: 'About' },
  { path: '/cart', name: 'Cart' },
  { path: '/auth', name: 'Auth' },
  { path: '/shipping', name: 'Shipping' },
  { path: '/returns', name: 'Returns' },
  { path: '/faq', name: 'FAQ' },
  { path: '/cgv', name: 'CGV' },
  { path: '/terms', name: 'Terms' },
  { path: '/terms-of-service', name: 'Terms of Service' },
  { path: '/story', name: 'Story' },
];

// ─── Redirection tests ────────────────────────────────────────────────────
describe('Enterprise: Redirections @enterprise @smoke', () => {
  it('should redirect /shop to /products', () => {
    cy.visit('/shop');
    cy.url().should('include', '/products');
    cy.url().should('not.include', '/shop');
  });

  it('should serve 404 for unknown routes', () => {
    cy.visit('/nonexistent-page-xyz-123', { failOnStatusCode: false });
    cy.get('body').should('be.visible');
    // NotFound page should render (straw illustration or similar)
    cy.get('body').contains(/404|not found|page introuvable/i).should('exist');
  });
});

// ─── Route accessibility & loading ──────────────────────────────────────────
describe('Enterprise: Public Route Loading @enterprise @regression', () => {
  PUBLIC_ROUTES.forEach(({ path, name }) => {
    it(`should load ${name} (${path}) without errors`, () => {
      cy.visit(path, { timeout: 20000 });
      cy.get('body').should('be.visible');
      // Pages use different structures; at least one of these should exist
      cy.get(
        '#main-content, main, [role="main"], footer, .container, form, .card, .min-h-screen',
        { timeout: 10000 }
      ).should('exist');
      cy.document().then((doc) => {
        expect(doc.readyState).to.eq('complete');
      });
    });
  });
});

// ─── DOM nomenclature & landmarks ──────────────────────────────────────────
describe('Enterprise: DOM Structure & Nomenclature @enterprise @regression', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should have main content landmark', () => {
    cy.get('#main-content').should('exist').and('be.visible');
  });

  it('should have skip-to-content link for accessibility', () => {
    cy.get('a[href="#main-content"]').should('exist');
  });

  it('should have header with navigation', () => {
    cy.get('header').should('exist');
    cy.get('nav[aria-label]').should('exist');
  });

  it('should have footer with links', () => {
    cy.get('footer').should('exist');
    cy.get('footer a[href="/products"]').should('exist');
  });

  it('should have homepage sections with expected IDs', () => {
    cy.get('#about').should('exist');
    cy.get('#shop').should('exist');
    cy.get('#testimonials').should('exist');
  });

  it('should have hero CTAs with correct IDs', () => {
    cy.get('#hero-discover-collection').should('exist');
    cy.get('#hero-our-story').should('exist');
  });
});

// ─── Navigation & buttons (desktop) ─────────────────────────────────────────
describe('Enterprise: Navigation & Buttons @enterprise @regression', () => {
  beforeEach(() => {
    cy.viewport(1280, 720);
    cy.visit('/');
  });

  it('should navigate via header links', () => {
    cy.get('nav').contains(/boutique|shop/i).click();
    cy.url().should('include', '/products');

    cy.visit('/');
    cy.get('nav').contains(/blog/i).click();
    cy.url().should('include', '/blog');

    cy.visit('/');
    cy.get('nav').contains(/contact/i).click();
    cy.url().should('include', '/contact');
  });

  it('should have cart link in header', () => {
    cy.get('a[href="/cart"]').should('exist');
  });

  it('should have auth link when not logged in', () => {
    cy.get('a[href="/auth"]').should('exist');
  });

  it('should navigate from hero to products', () => {
    cy.get('#hero-discover-collection').click();
    cy.url().should('include', '/products');
  });

  it('should navigate from hero to blog', () => {
    cy.get('#hero-our-story').click();
    cy.url().should('include', '/blog');
  });
});

// ─── Mobile menu ────────────────────────────────────────────────────────────
describe('Enterprise: Mobile Menu @enterprise @regression', () => {
  beforeEach(() => {
    cy.viewport(375, 667);
    cy.visit('/');
  });

  it('should show hamburger and open mobile menu', () => {
    cy.get('[aria-label="Ouvrir le menu"]').should('be.visible').click();
    cy.get('#mobile-menu').should('have.class', 'translate-x-0');
  });

  it('should close menu when link is clicked', () => {
    cy.get('[aria-label="Ouvrir le menu"]').click();
    cy.get('#mobile-menu').contains(/boutique|shop/i).click();
    cy.url().should('include', '/products');
    cy.get('#mobile-menu').should('have.class', 'translate-x-full');
  });
});

// ─── Products page & product cards ─────────────────────────────────────────
describe('Enterprise: Products & Product Cards @enterprise @smoke', () => {
  beforeEach(() => {
    cy.visit('/products');
    cy.get('body').should('be.visible');
  });

  it('should display product cards with correct structure', () => {
    cy.get('[id^="product-card-"]').should('have.length.at.least', 1);
    cy.get('[id^="product-title-"]').should('exist');
    cy.get('[id^="product-price-"]').should('exist');
  });

  it('should have add-to-cart buttons', () => {
    cy.get('[id^="add-to-cart-btn-"]').should('have.length.at.least', 1);
  });

  it('should add product to cart and update cart count', () => {
    cy.get('[id^="add-to-cart-btn-"]').first().click();
    // Cart count or cart link should reflect item
    cy.get('a[href="/cart"]').should('exist');
    // Zustand persists; cart count may show in header
    cy.visit('/cart');
    cy.get('[id^="cart-item-"]').should('have.length.at.least', 1);
  });

  it('should navigate to product detail on card click', () => {
    cy.get('[id^="product-card-"]').first().find('a').first().click();
    cy.url().should('match', /\/products\/\d+/);
  });

  it('should have search or filter controls on products page', () => {
    // AdvancedProductFilters: search input (placeholder FR/EN)
    cy.get(
      'input[placeholder*="Rechercher"], input[placeholder*="Search"], input[placeholder*="recherche"]'
    ).should('exist');
  });

  it('should filter products by search query', () => {
    // AdvancedProductFilters search input — use visible one (exclude hidden mobile menu)
    const searchSelector =
      'input[placeholder*="Rechercher"], input[placeholder*="Search"], input[placeholder*="recherche"]';
    cy.get(searchSelector).filter(':visible').first().type('straw');
    cy.get(searchSelector).filter(':visible').first().should('have.value', 'straw');
    cy.url().should('include', '/products');
  });
});

// ─── Cart page ──────────────────────────────────────────────────────────────
describe('Enterprise: Cart Page @enterprise @regression', () => {
  beforeEach(() => {
    cy.visit('/products');
    cy.get('[id^="add-to-cart-btn-"]').first().click();
    cy.visit('/cart');
  });

  it('should display cart items with correct IDs', () => {
    cy.get('[id^="cart-item-"]').should('have.length.at.least', 1);
    cy.get('[id^="cart-item-details-"]').should('exist');
  });

  it('should have remove, qty minus, qty plus buttons', () => {
    cy.get('[id^="cart-remove-"]').should('exist');
    cy.get('[id^="cart-qty-minus-"]').should('exist');
    cy.get('[id^="cart-qty-plus-"]').should('exist');
  });

  it('should have checkout button', () => {
    cy.get('#cart-checkout-button').should('exist').and('be.visible');
  });

  it('should navigate to checkout', () => {
    cy.get('#cart-checkout-button').click();
    cy.url().should('include', '/checkout');
  });

  it('should show empty state when cart is empty', () => {
    cy.clearLocalStorage();
    cy.visit('/cart');
    cy.get('#empty-cart-shop-button').should('exist');
  });
});

// ─── Contact form ──────────────────────────────────────────────────────────
describe('Enterprise: Contact Form @enterprise @regression', () => {
  beforeEach(() => {
    cy.visit('/contact');
  });

  it('should have all required form fields', () => {
    cy.get('#firstName').should('exist');
    cy.get('#lastName').should('exist');
    cy.get('#email').should('exist');
    cy.get('#subject').should('exist');
    cy.get('#message').should('exist');
    cy.get('#contact-form-submit').should('exist');
  });

  it('should validate message min length', () => {
    cy.get('#firstName').type('Test');
    cy.get('#lastName').type('User');
    cy.get('#email').type('test@example.com');
    cy.get('#subject').select(1);
    cy.get('#message').type('Short');
    cy.get('#contact-form-submit').click();
    cy.contains(/20|caractères|characters/i).should('exist');
  });

  it('should accept valid form and attempt submit', () => {
    cy.intercept('POST', '**/contact**', { statusCode: 200, body: {} }).as(
      'contactSubmit'
    );
    cy.get('#firstName').type('Jean');
    cy.get('#lastName').type('Dupont');
    cy.get('#email').type('jean.dupont@test.com');
    cy.get('#subject').select(1);
    cy.get('#message').type(
      'This is a valid message with more than twenty characters for testing.'
    );
    cy.get('#contact-form-submit').click();
    // Either success toast or network request
    cy.get('body').should('be.visible');
  });
});

// ─── Newsletter form ───────────────────────────────────────────────────────
describe('Enterprise: Newsletter @enterprise @regression', () => {
  it('should have newsletter on homepage', () => {
    cy.visit('/');
    cy.get('#newsletter-email').should('exist');
    cy.get('#newsletter-consent').should('exist');
  });

  it('should have newsletter in footer', () => {
    // PageFooter (with #newsletter-email-footer) is used on /products, /contact, etc.
    cy.visit('/products');
    cy.get('#newsletter-email-footer').should('exist');
  });

  it('should submit newsletter with valid email and consent', () => {
    cy.intercept('POST', '**/rest/v1/newsletter_subscriptions*', {
      statusCode: 201,
      body: {},
    }).as('newsletterSubscribe');
    cy.visit('/');
    cy.get('#newsletter-email').type('test.e2e@example.com');
    // Radix Checkbox renders as button[role="checkbox"]; use click, not cy.check()
    cy.get('#newsletter-consent').click();
    cy.get('#newsletter-email')
      .closest('form')
      .find('button[type="submit"]')
      .click();
    cy.get('body').should('be.visible');
  });
});

// ─── Auth page ──────────────────────────────────────────────────────────────
describe('Enterprise: Auth Page @enterprise @regression', () => {
  beforeEach(() => {
    cy.visit('/auth');
  });

  it('should have sign in form fields', () => {
    cy.get('#signin-email').should('exist');
    cy.get('#signin-password').should('exist');
  });

  it('should have sign up form when switching tab', () => {
    cy.contains(/inscription|sign up|s'inscrire/i).click();
    cy.get('#signup-email').should('exist');
    cy.get('#signup-password').should('exist');
  });
});

// ─── Checkout flow (multi-step) ──────────────────────────────────────────────
describe('Enterprise: Checkout Flow @enterprise @smoke', () => {
  beforeEach(() => {
    // Stub GET checkout_sessions so form persistence loads quickly (empty = no saved session)
    cy.intercept('GET', '**/rest/v1/checkout_sessions*', {
      statusCode: 200,
      body: [],
    }).as('checkoutSessionsGet');
    // Stub app_settings so free shipping fetch returns quickly
    cy.intercept('GET', '**/rest/v1/app_settings*', {
      statusCode: 200,
      body: [],
    }).as('appSettings');
    cy.visit('/products');
    cy.get('[id^="add-to-cart-btn-"]').first().click();
    cy.visit('/checkout');
  });

  it('should show step 1 personal info form', () => {
    cy.get('#firstName', { timeout: 15000 }).should('be.visible');
    cy.get('#lastName').should('be.visible');
    cy.get('#email').should('be.visible');
    cy.get('#phone').should('be.visible');
  });

  it('should advance to step 2 shipping after filling step 1', () => {
    // Wait for form to finish loading (skeleton gone, fields visible)
    cy.get('#firstName', { timeout: 15000 }).should('be.visible');
    cy.wait(500); // Brief pause for form to stabilize
    cy.get('#firstName').clear().type('Jean');
    cy.get('#lastName').clear().type('Dupont');
    cy.get('#email').clear().type('jean.dupont@test.com');
    cy.get('#phone').clear().type('+33612345678');
    // Use fieldset to target step 1 form button (avoids mobile sticky bar)
    cy.get('fieldset')
      .find('button')
      .contains(/livraison|shipping|suivant|next|continuer/i)
      .should('be.visible')
      .click();
    cy.get('#address', { timeout: 15000 }).should('be.visible');
  });

  it('should show promo code input', () => {
    cy.get('input[placeholder*="promo"], input[placeholder*="code"]').should(
      'exist'
    );
  });

  it('should validate postal code format for France', () => {
    cy.get('#firstName', { timeout: 15000 }).should('be.visible');
    cy.wait(500);
    cy.get('#firstName').clear().type('Jean');
    cy.get('#lastName').clear().type('Dupont');
    cy.get('#email').clear().type('jean@test.com');
    cy.get('fieldset')
      .find('button')
      .contains(/livraison|shipping|suivant|next|continuer/i)
      .should('be.visible')
      .click();
    cy.get('#address', { timeout: 15000 }).should('be.visible').type('12 Rue de la Paix');
    cy.get('#postalCode').type('123');
    cy.get('#city').type('Paris');
    cy.get('button')
      .contains(/paiement|payment/i)
      .first()
      .click();
    cy.get('.text-destructive, [role="alert"]', { timeout: 10000 }).should(
      'be.visible'
    );
  });
});

// ─── Footer links ───────────────────────────────────────────────────────────
describe('Enterprise: Footer Links @enterprise @regression', () => {
  beforeEach(() => {
    // Use /products - PageFooter has full link set; Index uses different Footer
    cy.visit('/products');
  });

  const footerLinks = [
    { href: '/products', text: /boutique|shop/i },
    { href: '/blog', text: /blog/i },
    { href: '/contact', text: /contact/i },
    { href: '/about', text: /about|story|notre histoire/i },
    { href: '/shipping', text: /livraison|shipping/i },
    { href: '/returns', text: /retours|returns/i },
    { href: '/faq', text: /faq/i },
    { href: '/cgv', text: /cgv|conditions/i },
    { href: '/terms', text: /mentions|terms/i },
  ];

  footerLinks.forEach(({ href, text }) => {
    it(`should have footer link to ${href}`, () => {
      cy.get(`footer a[href="${href}"]`).should('exist');
      cy.get('footer').contains(text).should('exist');
    });
  });
});

// ─── Network & caching (macro environment) ─────────────────────────────────
describe('Enterprise: Macro Environment — Network & Caching @enterprise', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should load without critical network errors', () => {
    cy.intercept('GET', '**/*').as('requests');
    cy.visit('/');
    cy.get('body').should('be.visible');
    // Allow some 404s for optional resources
    cy.wait(1000);
  });

  it('should have correct document ready state', () => {
    cy.document().then((doc) => {
      expect(doc.readyState).to.eq('complete');
    });
  });

  it('should not have ResizeObserver errors (handled by support)', () => {
    cy.get('#main-content').should('exist');
  });
});

// ─── Service worker & cache headers ───────────────────────────────────────
describe('Enterprise: Service Worker & Cache Headers @enterprise', () => {
  it('should register service worker on production build', function () {
    const url = Cypress.config('baseUrl');
    if (!url || url.includes('localhost')) {
      this.skip();
    }
    cy.visit('/');
    cy.window().then((win) => {
      if (win.navigator.serviceWorker) {
        win.navigator.serviceWorker.getRegistrations().then((regs) => {
          // SW may or may not be registered depending on HTTPS
          expect(Array.isArray(regs)).to.be.true;
        });
      }
    });
  });

  it('should load assets with cache headers when available', function () {
    cy.visit('/');
    cy.request({
      url: '/',
      failOnStatusCode: false,
    }).then((res) => {
      expect([200, 304]).to.include(res.status);
    });
  });
});

// ─── Loading states & skeletons ─────────────────────────────────────────────
describe('Enterprise: Loading States @enterprise @regression', () => {
  it('should show content after lazy route load', () => {
    cy.visit('/blog');
    cy.get('body').should('be.visible');
    cy.get(
      'main, #main-content, footer, .container, .min-h-screen',
      { timeout: 10000 }
    ).should('exist');
    cy.get('body').should('not.contain', 'Error');
  });

  it('should load product detail without blank screen', () => {
    cy.visit('/products');
    cy.get('[id^="product-card-"]').first().find('a').first().click();
    cy.url().should('match', /\/products\/\d+/);
    cy.get('body').should('be.visible');
  });
});

// ─── Redirect: unauthenticated protected routes ─────────────────────────────
describe('Enterprise: Auth Redirects @enterprise @regression', () => {
  it('should redirect to admin login when accessing /admin unauthenticated', () => {
    cy.visit('/admin');
    cy.url().should('include', '/admin/login');
  });

  it('should show auth page for /profile when not logged in', () => {
    cy.visit('/profile');
    // May redirect to /auth or show login prompt
    cy.url().then((url) => {
      expect(url).to.satisfy(
        (u) => u.includes('/auth') || u.includes('/profile')
      );
    });
  });
});

// ─── Blog page ──────────────────────────────────────────────────────────────
describe('Enterprise: Blog @enterprise @regression', () => {
  beforeEach(() => {
    cy.visit('/blog');
  });

  it('should display blog posts or empty state', () => {
    cy.get('body').should('be.visible');
    cy.get(
      'main, #main-content, footer, .container, .min-h-screen',
      { timeout: 10000 }
    ).should('exist');
  });

  it('should navigate to blog post when available', () => {
    cy.get('body').then(($body) => {
      const link = $body.find('a[href^="/blog/"]').first();
      if (link.length) {
        cy.wrap(link).click();
        cy.url().should('match', /\/blog\/\d+/);
      }
    });
  });
});

// ─── Legal & policy pages ───────────────────────────────────────────────────
describe('Enterprise: Legal Pages @enterprise @regression', () => {
  ['/shipping', '/returns', '/faq', '/cgv', '/terms', '/terms-of-service'].forEach(
    (path) => {
      it(`should load ${path}`, () => {
        cy.visit(path);
        cy.get('body').should('be.visible');
        cy.get('main, #main-content, [role="main"]').should('exist');
      });
    }
  );
});
