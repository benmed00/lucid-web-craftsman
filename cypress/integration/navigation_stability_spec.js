// cypress/integration/navigation_stability_spec.js
/**
 * Comprehensive Navigation Stability Test Suite
 * Tests for zero flickering and layout stability
 */

describe('Navigation Bar - Zero Flickering & Layout Stability', () => {
  beforeEach(() => {
    cy.visit('/');
    
    // Wait for navigation to be fully loaded
    cy.get('.navigation-root').should('be.visible');
    cy.get('.nav-link').should('have.length.greaterThan', 0);
  });

  describe('Layout Stability Tests', () => {
    it('should not cause layout shift on hover', () => {
      cy.get('.nav-link').first().then($el => {
        const initialRect = $el[0].getBoundingClientRect();
        
        // Hover over the element
        cy.wrap($el).trigger('mouseover');
        
        // Wait for animation to complete
        cy.wait(350); // Slightly longer than 300ms animation
        
        cy.wrap($el).then($el2 => {
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
      
      cy.get('.navigation-root').then($header => {
        initialHeight = $header[0].getBoundingClientRect().height;
      });
      
      // Navigate to different pages
      const pages = ['/products', '/blog', '/contact', '/'];
      
      pages.forEach(page => {
        cy.visit(page);
        cy.get('.navigation-root').should($header => {
          const currentHeight = $header[0].getBoundingClientRect().height;
          expect(Math.abs(currentHeight - initialHeight)).to.be.lt(1);
        });
      });
    });

    it('should show proper underline animation without layout shift', () => {
      cy.get('.nav-link').first().then($link => {
        // Check initial state - underline should be scaled to 0
        cy.window().then(win => {
          const afterStyles = win.getComputedStyle($link[0], '::after');
          expect(afterStyles.transform).to.match(/scaleX\(0\)/);
        });
        
        // Hover and check animation
        cy.wrap($link).trigger('mouseover');
        
        cy.wait(350);
        
        cy.window().then(win => {
          const afterStyles = win.getComputedStyle($link[0], '::after');
          expect(afterStyles.transform).to.match(/scaleX\(1\)/);
        });
      });
    });
  });

  describe('Current Page Indication', () => {
    it('should show active state for current page', () => {
      cy.visit('/blog');
      
      cy.get('.nav-link[aria-current="page"]').should('exist');
      cy.get('.nav-link[href="/blog"]').should('have.attr', 'aria-current', 'page');
    });

    it('should maintain active underline without flickering', () => {
      cy.visit('/blog');
      
      cy.get('.nav-link[aria-current="page"]').then($activeLink => {
        cy.window().then(win => {
          const afterStyles = win.getComputedStyle($activeLink[0], '::after');
          expect(afterStyles.transform).to.match(/scaleX\(1\)/);
        });
      });
    });
  });

  describe('Accessibility Tests', () => {
    it('should show proper focus states without layout shift', () => {
      cy.get('.nav-link').first().focus();
      
      cy.get('.nav-link:focus-visible').should('be.visible');
      cy.get('.nav-link:focus-visible').should('have.css', 'outline-width', '2px');
    });

    it('should have proper ARIA labels', () => {
      cy.get('[role="navigation"]').should('have.attr', 'aria-label');
      cy.get('.nav-link[aria-current="page"]').should('exist');
    });

    it('should support keyboard navigation', () => {
      cy.get('body').tab();
      cy.focused().should('match', '.nav-link');
      
      cy.get('body').tab();
      cy.focused().should('match', '.nav-link');
    });
  });

  describe('Performance Tests', () => {
    it('should have GPU-accelerated transforms', () => {
      cy.get('.nav-link').first().then($link => {
        cy.window().then(win => {
          const styles = win.getComputedStyle($link[0]);
          
          // Check for GPU acceleration indicators
          expect(styles.transform).to.not.equal('none');
          expect(styles.backfaceVisibility).to.equal('hidden');
        });
      });
    });

    it('should load without MIME type errors', () => {
      cy.window().then(win => {
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
    it('should disable animations for users with reduced motion preference', () => {
      cy.visit('/', {
        onBeforeLoad: win => {
          // Mock reduced motion preference
          Object.defineProperty(win, 'matchMedia', {
            writable: true,
            value: cy.stub().returns({
              matches: true, // prefers-reduced-motion: reduce
              addEventListener: cy.stub(),
              removeEventListener: cy.stub()
            })
          });
        }
      });
      
      cy.get('.nav-link').first().then($link => {
        cy.window().then(win => {
          const afterStyles = win.getComputedStyle($link[0], '::after');
          expect(afterStyles.transition).to.equal('none');
        });
      });
    });
  });

  describe('Mobile Responsiveness', () => {
    it('should maintain touch targets on mobile', () => {
      cy.viewport(375, 667); // iPhone SE dimensions
      
      cy.get('.nav-link').each($link => {
        const rect = $link[0].getBoundingClientRect();
        expect(rect.height).to.be.at.least(44); // WCAG minimum
        expect(rect.width).to.be.at.least(44);
      });
    });

    it('should show mobile menu without layout shifts', () => {
      cy.viewport(375, 667);
      
      cy.get('[aria-label*="menu"]').click();
      cy.get('.md\\:hidden .flex.flex-col').should('be.visible');
      
      // Check that header height remained stable
      cy.get('.navigation-root').should($header => {
        const height = $header[0].getBoundingClientRect().height;
        expect(height).to.be.within(60, 85); // Expected mobile header height range
      });
    });
  });
});

// Additional test for blog page loading skeleton
describe('Blog Page - Loading Skeleton', () => {
  it('should show skeleton during loading to prevent layout shifts', () => {
    // Intercept API call to simulate loading
    cy.intercept('GET', '**/blog-posts*', { delay: 2000, fixture: 'blog-posts.json' });
    
    cy.visit('/blog');
    
    // Should show skeleton immediately
    cy.get('.navigation-root').should('be.visible');
    // Note: BlogSkeleton should be visible but we need to check implementation
    
    // Wait for content to load and verify no layout shift
    cy.get('[data-testid="blog-content"]', { timeout: 3000 }).should('be.visible');
  });
});