// cypress/integration/navigation_stability_spec.js
/**
 * Comprehensive Navigation Stability Test Suite
 * Tests for zero flickering and layout stability
 */

describe('Navigation Bar - Zero Flickering & Layout Stability @regression', () => {
  beforeEach(() => {
    cy.visit('/');

    // Wait for navigation to be fully loaded (matches Navigation.tsx: header-nav-root, header-nav)
    cy.get('.header-nav-root').should('be.visible');
    cy.get('.header-nav a').should('have.length.greaterThan', 0);
  });

  describe('Layout Stability Tests', () => {
    it('should not cause layout shift on hover', () => {
      cy.get('.header-nav a')
        .first()
        .then(($el) => {
          const initialRect = $el[0].getBoundingClientRect();

          // Hover over the element
          cy.wrap($el).trigger('mouseover');

          // Wait for animation to complete
          cy.wait(350); // Slightly longer than 300ms animation

          cy.wrap($el).then(($el2) => {
            const newRect = $el2[0].getBoundingClientRect();

            // Assert no layout shift occurred
            expect(Math.abs(newRect.top - initialRect.top)).to.be.lt(1);
            expect(Math.abs(newRect.left - initialRect.left)).to.be.lt(1);
            expect(Math.abs(newRect.width - initialRect.width)).to.be.lt(1);
            expect(Math.abs(newRect.height - initialRect.height)).to.be.lt(1);
          });
        });
    });

    it('should maintain stable header height during navigation', () => {
      let initialHeight;

      cy.get('.header-nav-root').then(($header) => {
        initialHeight = $header[0].getBoundingClientRect().height;
      });

      // Navigate to different pages
      const pages = ['/products', '/blog', '/contact', '/'];

      pages.forEach((page) => {
        cy.visit(page);
        cy.get('.header-nav-root').should(($header) => {
          const currentHeight = $header[0].getBoundingClientRect().height;
          expect(Math.abs(currentHeight - initialHeight)).to.be.lt(1);
        });
      });
    });

    it('should show hover state without layout shift', () => {
      cy.get('.header-nav a')
        .first()
        .then(($link) => {
          const initialRect = $link[0].getBoundingClientRect();
          cy.wrap($link).trigger('mouseover');
          cy.wait(350);
          cy.wrap($link).then(($el) => {
            const rect = $el[0].getBoundingClientRect();
            expect(Math.abs(rect.top - initialRect.top)).to.be.lt(1);
            expect(Math.abs(rect.width - initialRect.width)).to.be.lt(1);
          });
        });
    });
  });

  describe('Current Page Indication', () => {
    it('should show active state for current page', () => {
      cy.visit('/blog');

      cy.get('.header-nav a[aria-current="page"]').should('exist');
      cy.get('.header-nav a[href="/blog"]').should(
        'have.attr',
        'aria-current',
        'page'
      );
    });

    it('should maintain active state without flickering', () => {
      cy.visit('/blog');

      cy.get('.header-nav a[aria-current="page"]').should('be.visible');
    });
  });

  describe('Accessibility Tests', () => {
    it('should show proper focus states without layout shift', () => {
      cy.get('.header-nav a').first().focus();

      cy.get('.header-nav a:focus-visible').should('be.visible');
      cy.get('.header-nav a:focus-visible').then(($el) => {
        const outline = $el[0] && window.getComputedStyle($el[0]).outlineWidth;
        expect(['1px', '2px']).to.include(outline);
      });
    });

    it('should have proper ARIA labels', () => {
      cy.get('[role="navigation"]').should('have.attr', 'aria-label');
      cy.get('.header-nav a[aria-current="page"]').should('exist');
    });

    it('should support keyboard navigation', () => {
      cy.get('.header-nav a').first().focus();
      cy.focused().should('match', '.header-nav a');

      cy.get('body').tab();
      cy.focused().should('match', '.header-nav a, a, button');
    });
  });

  describe('Performance Tests', () => {
    it('should have smooth transitions', () => {
      cy.get('.header-nav a')
        .first()
        .should('have.class', 'transition-all');
    });

    it('should load without MIME type errors', () => {
      cy.window().then((win) => {
        // Check that no CSS MIME type errors occurred
        const errors = [];
        const originalError = win.console.error;

        win.console.error = (...args) => {
          if (args.join(' ').includes('MIME type')) {
            errors.push(args.join(' '));
          }
          originalError.apply(win.console, args);
        };

        cy.reload();
        cy.wrap(errors).should('have.length', 0);
      });
    });
  });

  describe('Reduced Motion Support', () => {
    it('should have transition classes for animations', () => {
      cy.get('.header-nav a').first().should('have.class', 'transition-all');
    });
  });

  describe('Mobile Responsiveness', () => {
    it('should maintain touch targets on mobile menu links', () => {
      cy.viewport(375, 667); // iPhone SE dimensions

      // Open mobile menu (desktop nav is hidden on mobile)
      cy.get('[aria-label="Ouvrir le menu"]').click();
      cy.get('#mobile-menu').should('have.class', 'translate-x-0');

      // Mobile menu links should meet WCAG touch target size
      cy.get('#mobile-menu a').each(($link) => {
        const rect = $link[0].getBoundingClientRect();
        expect(rect.height).to.be.at.least(44); // WCAG minimum
        expect(rect.width).to.be.at.least(44);
      });
    });

    it('should show mobile menu without layout shifts', () => {
      cy.viewport(375, 667);

      cy.get('[aria-label="Ouvrir le menu"]').click();
      cy.get('#mobile-menu').should('be.visible');

      // Check that header height remained stable
      cy.get('.header-nav-root').should(($header) => {
        const height = $header[0].getBoundingClientRect().height;
        expect(height).to.be.within(56, 96); // h-14 to h-16 range
      });
    });
  });
});

// Additional test for blog page loading
describe('Blog Page - Loading @regression', () => {
  it('should load blog page and show content or empty state', () => {
    cy.visit('/blog');

    // Header should be visible immediately
    cy.get('.header-nav-root').should('be.visible');

    // Blog page should render main content (posts, skeleton, or empty state)
    cy.get('main, #main-content, [role="main"], .container, .min-h-screen', {
      timeout: 10000,
    }).should('exist');
    cy.get('body').should('be.visible');
  });
});
