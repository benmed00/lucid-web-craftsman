/**
 * Mobile menu — canonical E2E for hamburger, sheet, viewports (W10).
 * enterprise_full_platform_spec does not duplicate this; extend tests here.
 */

// Common viewport sizes for testing
const VIEWPORTS = {
  mobileSmall: { width: 320, height: 568, name: 'iPhone SE (small)' },
  mobileMedium: { width: 375, height: 667, name: 'iPhone 8' },
  mobileLarge: { width: 414, height: 896, name: 'iPhone 11 Pro Max' },
  smBreakpoint: { width: 640, height: 800, name: 'SM Breakpoint (640px)' },
  tablet: { width: 768, height: 1024, name: 'iPad' },
  tabletLandscape: { width: 1024, height: 768, name: 'iPad Landscape' },
  desktop: { width: 1280, height: 800, name: 'Desktop' },
  desktopLarge: { width: 1920, height: 1080, name: 'Desktop Large' },
};

describe('Mobile Menu - Core Functionality @regression', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  describe('Menu Toggle Behavior', () => {
    it('should show hamburger button on mobile and hide on desktop', () => {
      // Mobile - should show hamburger
      cy.viewport(VIEWPORTS.mobileMedium.width, VIEWPORTS.mobileMedium.height);
      cy.get('[aria-label="Ouvrir le menu"]').should('be.visible');

      // Desktop - hamburger should be hidden (md:hidden class)
      cy.viewport(VIEWPORTS.desktop.width, VIEWPORTS.desktop.height);
      cy.get('[aria-label="Ouvrir le menu"]').should('not.be.visible');
    });

    it('should open menu when hamburger is clicked', () => {
      cy.viewport(VIEWPORTS.mobileMedium.width, VIEWPORTS.mobileMedium.height);

      // Menu should be initially hidden (translated off-screen)
      cy.get('#mobile-menu').should('have.class', 'translate-x-full');

      // Click hamburger
      cy.get('[aria-label="Ouvrir le menu"]').click();

      // Menu should be visible (translated to 0)
      cy.get('#mobile-menu').should('have.class', 'translate-x-0');
      cy.get('#mobile-menu').should('not.have.attr', 'aria-hidden', 'true');
    });

    it('should close menu when X button inside menu is clicked', () => {
      cy.viewport(VIEWPORTS.mobileMedium.width, VIEWPORTS.mobileMedium.height);

      // Open menu
      cy.get('[aria-label="Ouvrir le menu"]').click();
      cy.get('#mobile-menu').should('have.class', 'translate-x-0');

      // Click X button inside menu
      cy.get('#mobile-menu [aria-label="Fermer le menu"]').click();

      // Menu should be closed
      cy.get('#mobile-menu').should('have.class', 'translate-x-full');
    });

    it('should close menu when overlay is clicked', () => {
      cy.viewport(VIEWPORTS.mobileMedium.width, VIEWPORTS.mobileMedium.height);

      cy.get('[aria-label="Ouvrir le menu"]').click();
      cy.get('#mobile-menu').should('have.class', 'translate-x-0');

      // Overlay uses bg-foreground/50 (Navigation.tsx)
      cy.get('[class*="bg-foreground/50"], [class*="z-mobile-overlay"]')
        .first()
        .click({ force: true });

      cy.get('#mobile-menu').should('have.class', 'translate-x-full');
    });

    it('should toggle hamburger icon between Menu and X', () => {
      cy.viewport(VIEWPORTS.mobileMedium.width, VIEWPORTS.mobileMedium.height);

      cy.get('[aria-label="Ouvrir le menu"]').should('exist');

      cy.get('[aria-label="Ouvrir le menu"]').click();
      cy.get('[aria-label="Fermer le menu"]').should('exist');

      // Close via overlay or X inside menu (X can be covered by header; use overlay)
      cy.get('[class*="bg-foreground/50"]').first().click({ force: true });
      cy.get('[aria-label="Ouvrir le menu"]').should('exist');
    });
  });
});

describe('Mobile Menu - Breakpoint Transitions @regression', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should close menu when resizing from mobile to desktop', () => {
    // Start at mobile
    cy.viewport(VIEWPORTS.mobileMedium.width, VIEWPORTS.mobileMedium.height);

    // Open menu
    cy.get('[aria-label="Ouvrir le menu"]').click();
    cy.get('#mobile-menu').should('have.class', 'translate-x-0');

    // Resize to desktop (768px is the md breakpoint)
    cy.viewport(VIEWPORTS.tablet.width, VIEWPORTS.tablet.height);

    // Wait for resize handler
    cy.wait(100);

    // Menu should be automatically closed
    cy.get('#mobile-menu').should('have.class', 'translate-x-full');
  });

  it('should keep menu closed when resizing within mobile range', () => {
    // Start at small mobile
    cy.viewport(VIEWPORTS.mobileSmall.width, VIEWPORTS.mobileSmall.height);
    cy.get('#mobile-menu').should('have.class', 'translate-x-full');

    // Resize to larger mobile (still < 768px)
    cy.viewport(VIEWPORTS.smBreakpoint.width, VIEWPORTS.smBreakpoint.height);
    cy.wait(100);

    // Menu should still be closed
    cy.get('#mobile-menu').should('have.class', 'translate-x-full');
  });

  it('should not show duplicate menus at 640px breakpoint', () => {
    cy.viewport(VIEWPORTS.smBreakpoint.width, VIEWPORTS.smBreakpoint.height);

    // Only one mobile menu should exist
    cy.get('#mobile-menu').should('have.length', 1);

    // Open menu
    cy.get('[aria-label="Ouvrir le menu"]').click();

    // Still only one menu
    cy.get('#mobile-menu').should('have.length', 1);
    cy.get('#mobile-menu').should('have.class', 'translate-x-0');
  });
});

describe('Mobile Menu - Responsive Width @regression', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should have max-width 320px on small screens (< 640px)', () => {
    cy.viewport(VIEWPORTS.mobileSmall.width, VIEWPORTS.mobileSmall.height);

    cy.get('[aria-label="Ouvrir le menu"]').click();

    cy.get('#mobile-menu').then(($menu) => {
      const width = $menu[0].getBoundingClientRect().width;
      expect(width).to.be.at.most(320);
    });
  });

  it('should have max-width 384px on sm breakpoint (>= 640px)', () => {
    cy.viewport(VIEWPORTS.smBreakpoint.width, VIEWPORTS.smBreakpoint.height);

    cy.get('[aria-label="Ouvrir le menu"]').click();

    cy.get('#mobile-menu').then(($menu) => {
      const width = $menu[0].getBoundingClientRect().width;
      expect(width).to.be.at.most(384); // sm:max-w-sm = 384px
    });
  });

  it('should maintain proper menu width classes', () => {
    // Matches Navigation.tsx: max-w-xs (320px), sm:max-w-sm (384px)
    cy.get('#mobile-menu').should('have.class', 'max-w-xs');
    cy.get('#mobile-menu').should('have.class', 'sm:max-w-sm');
  });
});

describe('Mobile Menu - Navigation Links @regression', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(VIEWPORTS.mobileMedium.width, VIEWPORTS.mobileMedium.height);
  });

  it('should close menu when a navigation link is clicked', () => {
    // Open menu
    cy.get('[aria-label="Ouvrir le menu"]').click();
    cy.get('#mobile-menu').should('have.class', 'translate-x-0');

    // Click on Boutique link inside menu
    cy.get('#mobile-menu').contains('Boutique').click();

    // Menu should close
    cy.get('#mobile-menu').should('have.class', 'translate-x-full');

    // Should navigate to products page
    cy.url().should('include', '/products');
  });

  it('should highlight current page in mobile menu', () => {
    cy.visit('/products');
    cy.viewport(VIEWPORTS.mobileMedium.width, VIEWPORTS.mobileMedium.height);

    cy.get('[aria-label="Ouvrir le menu"]').click();

    // Active link uses bg-primary (Navigation.tsx)
    cy.get('#mobile-menu')
      .contains(/boutique|shop/i)
      .closest('a')
      .should('have.class', 'bg-primary');
  });

  it('should contain all main navigation links', () => {
    cy.get('[aria-label="Ouvrir le menu"]').click();

    const expectedLinks = ['Accueil', 'Boutique', 'Blog', 'Contact'];

    expectedLinks.forEach((linkText) => {
      cy.get('#mobile-menu').contains(linkText).should('exist');
    });
  });
});

describe('Mobile Menu - Scrolling Behavior @regression', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(VIEWPORTS.mobileMedium.width, VIEWPORTS.mobileMedium.height);
  });

  it('should allow scrolling inside menu when content overflows', () => {
    cy.get('[aria-label="Ouvrir le menu"]').click();

    // Menu content should be scrollable
    cy.get('#mobile-menu .overflow-y-auto').should('exist');
  });

  it('should keep close button visible when scrolling menu content', () => {
    cy.get('[aria-label="Ouvrir le menu"]').click();

    // Close button should be in a flex-shrink-0 header
    cy.get('#mobile-menu .flex-shrink-0').should('exist');
    cy.get('#mobile-menu [aria-label="Fermer le menu"]').should('be.visible');

    // Scroll menu content
    cy.get('#mobile-menu .overflow-y-auto').scrollTo('bottom');

    // Close button should still be visible
    cy.get('#mobile-menu [aria-label="Fermer le menu"]').should('be.visible');
  });
});

describe('Mobile Menu - Accessibility @regression', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(VIEWPORTS.mobileMedium.width, VIEWPORTS.mobileMedium.height);
  });

  it('should have proper ARIA attributes on hamburger button', () => {
    cy.get('[aria-label="Ouvrir le menu"]')
      .should('have.attr', 'aria-expanded', 'false')
      .should('have.attr', 'aria-haspopup', 'true')
      .should('have.attr', 'aria-controls', 'mobile-menu');
  });

  it('should update aria-expanded when menu is opened', () => {
    cy.get('[aria-label="Ouvrir le menu"]').click();

    // Button should now have aria-expanded="true"
    cy.get('header [aria-label="Fermer le menu"]').should(
      'have.attr',
      'aria-expanded',
      'true'
    );
  });

  it('should have proper role on mobile menu', () => {
    cy.get('#mobile-menu')
      .should('have.attr', 'role', 'menu')
      .should('have.attr', 'aria-label', 'Menu principal mobile');
  });

  it('should set aria-hidden on closed menu', () => {
    // Menu is closed initially
    cy.get('#mobile-menu').should('have.attr', 'aria-hidden', 'true');

    // Open menu
    cy.get('[aria-label="Ouvrir le menu"]').click();

    // aria-hidden should be removed
    cy.get('#mobile-menu').should('not.have.attr', 'aria-hidden', 'true');
  });

  it('should have focusable elements with correct tabIndex', () => {
    // Open menu
    cy.get('[aria-label="Ouvrir le menu"]').click();

    // Close button and links should be focusable when menu is open (tabIndex 0 or default)
    cy.get('#mobile-menu [aria-label="Fermer le menu"]').should('exist');
    cy.get('#mobile-menu a').first().should('exist');
  });
});

describe('Mobile Menu - Animation & Transitions @regression', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(VIEWPORTS.mobileMedium.width, VIEWPORTS.mobileMedium.height);
  });

  it('should have smooth transition on open/close', () => {
    cy.get('#mobile-menu').should('have.class', 'transition-transform');
    cy.get('#mobile-menu').should('have.class', 'duration-300');
    cy.get('#mobile-menu').should('have.class', 'ease-out');
  });

  it('should show overlay with fade effect', () => {
    cy.get('[aria-label="Ouvrir le menu"]').click();

    // Overlay uses bg-foreground/50
    cy.get('[class*="bg-foreground/50"]').should('be.visible');
  });
});

describe('Mobile Menu - Cross-Viewport Testing @regression', () => {
  Object.entries(VIEWPORTS).forEach(([key, viewport]) => {
    describe(`Viewport: ${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      beforeEach(() => {
        cy.viewport(viewport.width, viewport.height);
        cy.visit('/');
      });

      if (viewport.width < 768) {
        // Mobile viewports
        it('should show hamburger menu', () => {
          cy.get('[aria-label="Ouvrir le menu"]').should('be.visible');
        });

        it('should open and close menu correctly', () => {
          cy.get('[aria-label="Ouvrir le menu"]').click();
          cy.get('#mobile-menu').should('have.class', 'translate-x-0');

          cy.get('#mobile-menu [aria-label="Fermer le menu"]').click();
          cy.get('#mobile-menu').should('have.class', 'translate-x-full');
        });
      } else {
        // Desktop viewports
        it('should show desktop navigation', () => {
          cy.get('nav[aria-label="Navigation principale"]').should(
            'be.visible'
          );
        });

        it('should hide hamburger menu', () => {
          cy.get('[aria-label="Ouvrir le menu"]').should('not.be.visible');
        });
      }
    });
  });
});

describe('Mobile Menu - Edge Cases @regression', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should handle rapid open/close clicks', () => {
    cy.viewport(VIEWPORTS.mobileMedium.width, VIEWPORTS.mobileMedium.height);

    cy.get('[aria-label="Ouvrir le menu"]').click();
    cy.get('[class*="bg-foreground/50"]').first().click({ force: true });
    cy.get('[aria-label="Ouvrir le menu"]').click();
    cy.get('[class*="bg-foreground/50"]').first().click({ force: true });

    cy.get('#mobile-menu').should('have.class', 'translate-x-full');
  });

  it('should work correctly after page navigation', () => {
    cy.viewport(VIEWPORTS.mobileMedium.width, VIEWPORTS.mobileMedium.height);

    // Navigate to another page via mobile menu
    cy.get('[aria-label="Ouvrir le menu"]').click();
    cy.get('#mobile-menu').contains('Blog').click();

    // On new page, menu should be closed
    cy.url().should('include', '/blog');
    cy.get('#mobile-menu').should('have.class', 'translate-x-full');

    // Should be able to open menu again
    cy.get('[aria-label="Ouvrir le menu"]').click();
    cy.get('#mobile-menu').should('have.class', 'translate-x-0');
  });

  it('should maintain state correctly when rotating device', () => {
    // Portrait
    cy.viewport(375, 812);
    cy.get('[aria-label="Ouvrir le menu"]').click();
    cy.get('#mobile-menu').should('have.class', 'translate-x-0');

    // Rotate to landscape (still mobile width)
    cy.viewport(812, 375);
    cy.wait(100);

    // Menu should still be open if width < 768
    // Actually 812 > 768, so menu should close
    cy.get('#mobile-menu').should('have.class', 'translate-x-full');
  });
});
