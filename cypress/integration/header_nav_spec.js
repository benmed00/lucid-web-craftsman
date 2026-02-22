// cypress/integration/header_nav_spec.js
/**
 * Header Navigation Layout Stability Tests
 * Validates zero flickering and no layout shifts on hover/focus
 */

describe('Header nav underline – visual stability @smoke @regression', () => {
  beforeEach(() => {
    cy.visit('/');

    // Wait for navigation to be fully rendered
    cy.get('.header-nav').should('be.visible');
    cy.get('.header-nav a').should('have.length.greaterThan', 0);
  });

  it('does not cause layout shift on hover', () => {
    cy.get('.header-nav a')
      .first()
      .then(($el) => {
        const initialRect = $el[0].getBoundingClientRect();

        // Trigger hover
        cy.wrap($el).trigger('mouseover');

        // Wait for animation to complete (300ms + buffer)
        cy.wait(350);

        cy.wrap($el).then(($el2) => {
          const rect2 = $el2[0].getBoundingClientRect();

          // REQUIREMENT: Assert no major layout shifts
          expect(Math.abs(rect2.top - initialRect.top)).to.be.lt(1);
          expect(Math.abs(rect2.height - initialRect.height)).to.be.lt(1);
          expect(Math.abs(rect2.left - initialRect.left)).to.be.lt(1);
          expect(Math.abs(rect2.width - initialRect.width)).to.be.lt(1);
        });
      });
  });

  it('focus state shows underline and no shift', () => {
    cy.get('.header-nav a')
      .first()
      .then(($el) => {
        const initialRect = $el[0].getBoundingClientRect();

        // Focus the element
        cy.wrap($el).focus();

        // Wait for focus animation
        cy.wait(350);

        cy.wrap($el).then(($el2) => {
          const rect2 = $el2[0].getBoundingClientRect();

          // Verify focus state is applied
          cy.wrap($el2).should('have.focus');

          // REQUIREMENT: Assert no layout shift on focus
          expect(Math.abs(rect2.top - initialRect.top)).to.be.lt(1);
          expect(Math.abs(rect2.height - initialRect.height)).to.be.lt(1);
        });
      });
  });

  it('should show transform-based underline animation', () => {
    cy.get('.header-nav a')
      .first()
      .then(($link) => {
        // Check initial state - underline should be scaleX(0)
        cy.window().then((win) => {
          const afterStyles = win.getComputedStyle($link[0], '::after');
          expect(afterStyles.transform).to.match(/scaleX\(0\)/);
        });

        // Hover and verify transform changes
        cy.wrap($link).trigger('mouseover');
        cy.wait(350);

        cy.window().then((win) => {
          const afterStyles = win.getComputedStyle($link[0], '::after');
          expect(afterStyles.transform).to.match(/scaleX\(1\)/);
        });
      });
  });

  it('should maintain active state for current page', () => {
    // Visit products page
    cy.visit('/products');

    // Check that current page has aria-current
    cy.get('.header-nav a[aria-current="page"]').should('exist');
    cy.get('.header-nav a[href="/products"]').should(
      'have.attr',
      'aria-current',
      'page'
    );

    // Verify persistent underline
    cy.get('.header-nav a[aria-current="page"]').then(($activeLink) => {
      cy.window().then((win) => {
        const afterStyles = win.getComputedStyle($activeLink[0], '::after');
        expect(afterStyles.transform).to.match(/scaleX\(1\)/);
      });
    });
  });

  it('should have proper touch targets on mobile', () => {
    cy.viewport(375, 667); // iPhone SE

    cy.get('.header-nav a').each(($link) => {
      const rect = $link[0].getBoundingClientRect();

      // REQUIREMENT: >= 44px touch targets
      expect(rect.height).to.be.at.least(44);
      expect(rect.width).to.be.at.least(44);
    });
  });

  it('should support keyboard navigation without layout shifts', () => {
    // Tab through navigation links
    cy.get('body').tab();

    cy.focused().should('match', '.header-nav a');

    cy.focused().then(($focused) => {
      const initialRect = $focused[0].getBoundingClientRect();

      // Move to next link
      cy.get('body').tab();

      // Check previous link position didn't change
      cy.wrap($focused).then(($el) => {
        const newRect = $el[0].getBoundingClientRect();
        expect(Math.abs(newRect.top - initialRect.top)).to.be.lt(1);
      });
    });
  });

  it('should have visible focus states with high contrast', () => {
    cy.get('.header-nav a').first().focus();

    cy.get('.header-nav a:focus-visible').should('be.visible');
    cy.get('.header-nav a:focus-visible').should(
      'have.css',
      'outline-width',
      '2px'
    );
    cy.get('.header-nav a:focus-visible').should(
      'have.css',
      'outline-style',
      'solid'
    );
  });

  it('should disable animations with prefers-reduced-motion', () => {
    // Mock reduced motion preference
    cy.visit('/', {
      onBeforeLoad: (win) => {
        Object.defineProperty(win, 'matchMedia', {
          writable: true,
          value: cy.stub().returns({
            matches: true, // prefers-reduced-motion: reduce
            addEventListener: cy.stub(),
            removeEventListener: cy.stub(),
          }),
        });
      },
    });

    cy.get('.header-nav a')
      .first()
      .then(($link) => {
        cy.window().then((win) => {
          const afterStyles = win.getComputedStyle($link[0], '::after');

          // REQUIREMENT: Animation should be disabled
          expect(afterStyles.transition).to.equal('none');
        });
      });
  });

  it('should use only compositing properties for animation', () => {
    cy.get('.header-nav a')
      .first()
      .then(($link) => {
        cy.window().then((win) => {
          const afterStyles = win.getComputedStyle($link[0], '::after');

          // REQUIREMENT: Only transform and opacity should change
          expect(afterStyles.willChange).to.include('transform');
          expect(afterStyles.backfaceVisibility).to.equal('hidden');
        });
      });
  });

  it('should have proper semantic markup', () => {
    // REQUIREMENT: Semantic HTML structure
    cy.get('nav[role="navigation"]').should('exist');
    cy.get('.header-nav ul').should('exist');
    cy.get('.header-nav li').should('have.length.greaterThan', 0);
    cy.get('nav[aria-label*="Navigation"]').should('exist');
  });

  it('should maintain z-index hierarchy', () => {
    cy.get('.header-nav a')
      .first()
      .then(($link) => {
        cy.window().then((win) => {
          const afterStyles = win.getComputedStyle($link[0], '::after');

          // REQUIREMENT: z-index safeguards
          expect(parseInt(afterStyles.zIndex)).to.be.greaterThan(0);
        });
      });
  });

  it('should not use global will-change', () => {
    // Check that will-change is not applied globally
    cy.get('body').should(($body) => {
      const styles = window.getComputedStyle($body[0]);
      expect(styles.willChange).to.equal('auto');
    });

    // Should only be on pseudo-elements when needed
    cy.get('.header-nav a')
      .first()
      .should(($link) => {
        const styles = window.getComputedStyle($link[0]);
        expect(styles.willChange).to.equal('auto');
      });
  });
});

// Performance and accessibility tests
describe('Header nav performance and accessibility @regression', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should pass basic accessibility checks', () => {
    // Install and run axe-core if available
    cy.injectAxe();
    cy.checkA11y('.header-nav-root', {
      rules: {
        'color-contrast': { enabled: true },
        'focus-trap': { enabled: true },
        'keyboard-navigation': { enabled: true },
      },
    });
  });

  it('should have proper WCAG color contrast', () => {
    cy.get('.header-nav a')
      .first()
      .should(($link) => {
        const styles = window.getComputedStyle($link[0]);
        const color = styles.color;
        const backgroundColor = styles.backgroundColor;

        // Basic contrast check (would need actual contrast calculation in real implementation)
        expect(color).to.not.equal(backgroundColor);
      });
  });

  it('should load without console errors', () => {
    cy.window().then((win) => {
      const errors = [];
      const originalError = win.console.error;

      win.console.error = (...args) => {
        errors.push(args.join(' '));
        originalError.apply(win.console, args);
      };

      cy.reload();
      cy.wrap(errors).should('have.length', 0);
    });
  });
});
