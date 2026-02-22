// src/components/Navigation.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navigation from './Navigation';

// Mock the hooks
vi.mock('@/hooks/useCartUI', () => ({
  useCartUI: () => ({ itemCount: 0 })
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isLoading: false, signOut: vi.fn() })
}));

vi.mock('@/hooks/useWishlist', () => ({
  useWishlist: () => ({ wishlistCount: 0 })
}));

// Mock i18n to return French labels expected by tests
vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => {
        const map: Record<string, string> = {
          'common:accessibility.openMenu': 'Ouvrir le menu',
          'common:accessibility.closeMenu': 'Fermer le menu',
          'common:accessibility.mainNav': 'Navigation principale',
          'common:accessibility.mobileNav': 'Menu principal mobile',
          'common:accessibility.skipToContent': 'Passer au contenu principal',
          'common:nav.shop': 'Boutique',
        };
        return map[key] ?? key;
      },
      i18n: { language: 'fr' },
    }),
  };
});

// React Router future flags to silence v7 migration warnings
const futureFlags = { v7_startTransition: true, v7_relativeSplatPath: true };

// Helper to render Navigation with Router
const renderNavigation = () => {
  return render(
    <MemoryRouter future={futureFlags}>
      <Navigation />
    </MemoryRouter>
  );
};

// Helper to mock window.innerWidth and dispatch resize event
const setWindowWidth = (width: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  act(() => {
    window.dispatchEvent(new Event('resize'));
  });
};

describe('Navigation Component', () => {
  let originalInnerWidth: number;

  beforeEach(() => {
    originalInnerWidth = window.innerWidth;
  });

  afterEach(() => {
    // Restore original width
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  describe('Mobile Menu Toggle', () => {
    it('should render hamburger button on mobile', () => {
      setWindowWidth(640);
      const { getByLabelText } = renderNavigation();
      
      const hamburgerButton = getByLabelText('Ouvrir le menu');
      expect(hamburgerButton).toBeInTheDocument();
    });

    it('should open mobile menu when hamburger is clicked', () => {
      setWindowWidth(640);
      const { getByLabelText, getByRole } = renderNavigation();
      
      const hamburgerButton = getByLabelText('Ouvrir le menu');
      act(() => {
        hamburgerButton.click();
      });
      
      const mobileMenu = getByRole('menu', { name: 'Menu principal mobile' });
      expect(mobileMenu).not.toHaveAttribute('aria-hidden', 'true');
    });

    it('should close mobile menu when close button inside menu is clicked', () => {
      setWindowWidth(640);
      const { getByLabelText, getAllByLabelText, container } = renderNavigation();
      
      // Open menu first
      const hamburgerButton = getByLabelText('Ouvrir le menu');
      act(() => {
        hamburgerButton.click();
      });
      
      // Find and click close button inside mobile menu (second one)
      const closeButtons = getAllByLabelText('Fermer le menu');
      const menuCloseButton = closeButtons.find(btn =>
        btn.closest('#mobile-menu')
      );
      
      act(() => {
        menuCloseButton?.click();
      });
      
      const mobileMenu = container.querySelector('#mobile-menu');
      expect(mobileMenu).toBeInTheDocument();
      expect(mobileMenu).toHaveAttribute('aria-hidden', 'true');
    });

    it('should toggle hamburger icon to X when menu is open', () => {
      setWindowWidth(640);
      const { getByLabelText, getAllByLabelText } = renderNavigation();
      
      const hamburgerButton = getByLabelText('Ouvrir le menu');
      act(() => {
        hamburgerButton.click();
      });
      
      // After opening, button should have "Fermer le menu" label
      const closeButtons = getAllByLabelText('Fermer le menu');
      expect(closeButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Breakpoint Behavior', () => {
    it('should have md:hidden class on hamburger button (hidden on desktop)', () => {
      const { getByLabelText } = renderNavigation();
      
      const hamburgerButton = getByLabelText('Ouvrir le menu');
      expect(hamburgerButton).toHaveClass('md:hidden');
    });

    it('should have hidden md:flex class on desktop nav', () => {
      const { getByRole } = renderNavigation();
      
      const desktopNav = getByRole('navigation', { name: 'Navigation principale' });
      expect(desktopNav).toHaveClass('hidden');
      expect(desktopNav).toHaveClass('md:flex');
    });

    it('should close mobile menu when resizing from mobile to desktop', () => {
      // Start at mobile width
      setWindowWidth(640);
      const { getByLabelText, getByRole } = renderNavigation();
      
      // Open mobile menu
      const hamburgerButton = getByLabelText('Ouvrir le menu');
      act(() => {
        hamburgerButton.click();
      });
      
      const mobileMenu = getByRole('menu', { name: 'Menu principal mobile' });
      expect(mobileMenu).not.toHaveAttribute('aria-hidden', 'true');
      
      // Resize to desktop (>= 768px)
      setWindowWidth(1024);
      
      // Menu should now be closed
      expect(mobileMenu).toHaveAttribute('aria-hidden', 'true');
    });

    it('should keep mobile menu closed when resizing within mobile range', () => {
      setWindowWidth(480);
      const { container } = renderNavigation();
      
      const mobileMenu = container.querySelector('#mobile-menu');
      expect(mobileMenu).toBeInTheDocument();
      expect(mobileMenu).toHaveAttribute('aria-hidden', 'true');
      
      // Resize to another mobile width (still < 768px)
      setWindowWidth(640);
      
      // Menu should still be closed
      expect(mobileMenu).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Menu Width Classes', () => {
    it('should have correct max-width classes for responsive behavior', () => {
      const { container } = renderNavigation();
      
      const mobileMenu = container.querySelector('#mobile-menu');
      expect(mobileMenu).toBeInTheDocument();
      expect(mobileMenu).toHaveClass('max-w-xs');
      expect(mobileMenu).toHaveClass('sm:max-w-sm');
    });
  });

  describe('Overlay Behavior', () => {
    it('should show overlay when menu is open', () => {
      setWindowWidth(640);
      const { getByLabelText, container } = renderNavigation();
      
      // Open menu
      const hamburgerButton = getByLabelText('Ouvrir le menu');
      act(() => {
        hamburgerButton.click();
      });
      
      const overlay = container.querySelector('[class*="foreground/50"]');
      expect(overlay).toBeInTheDocument();
    });

    it('should close menu when overlay is clicked', () => {
      setWindowWidth(640);
      const { getByLabelText, container } = renderNavigation();
      
      // Open menu
      const hamburgerButton = getByLabelText('Ouvrir le menu');
      act(() => {
        hamburgerButton.click();
      });
      
      // Click overlay
      const overlay = container.querySelector('[class*="foreground/50"]');
      act(() => {
        overlay?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      
      const mobileMenu = container.querySelector('#mobile-menu');
      expect(mobileMenu).toBeInTheDocument();
      expect(mobileMenu).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Navigation Links', () => {
    it('should close menu when a nav link is clicked', () => {
      setWindowWidth(640);
      const { getByLabelText, getAllByText, container } = renderNavigation();
      
      // Open menu
      const hamburgerButton = getByLabelText('Ouvrir le menu');
      act(() => {
        hamburgerButton.click();
      });
      
      // Find Boutique link inside mobile menu
      const boutiqueLinks = getAllByText('Boutique');
      const mobileLink = boutiqueLinks.find(link =>
        link.closest('#mobile-menu')
      );
      
      act(() => {
        mobileLink?.click();
      });
      
      const mobileMenu = container.querySelector('#mobile-menu');
      expect(mobileMenu).toBeInTheDocument();
      expect(mobileMenu).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria attributes on hamburger button', () => {
      const { getByLabelText } = renderNavigation();
      
      const hamburgerButton = getByLabelText('Ouvrir le menu');
      expect(hamburgerButton).toHaveAttribute('aria-expanded', 'false');
      expect(hamburgerButton).toHaveAttribute('aria-haspopup', 'true');
      expect(hamburgerButton).toHaveAttribute('aria-controls', 'mobile-menu');
    });

    it('should update aria-expanded to true when menu is opened', () => {
      setWindowWidth(640);
      const { getByLabelText, getAllByLabelText } = renderNavigation();
      
      const hamburgerButton = getByLabelText('Ouvrir le menu');
      act(() => {
        hamburgerButton.click();
      });
      
      // Two buttons have "Fermer le menu" (header toggle + menu close); get header one by aria-controls
      const closeButtons = getAllByLabelText('Fermer le menu');
      const headerCloseButton = closeButtons.find(btn => btn.getAttribute('aria-controls') === 'mobile-menu');
      expect(headerCloseButton).toBeDefined();
      expect(headerCloseButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('should have skip link for accessibility', () => {
      const { getByText } = renderNavigation();
      
      const skipLink = getByText('Passer au contenu principal');
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute('href', '#main-content');
    });

    it('should have proper role on mobile menu', () => {
      const { container } = renderNavigation();
      
      const mobileMenu = container.querySelector('#mobile-menu');
      expect(mobileMenu).toBeInTheDocument();
      expect(mobileMenu).toHaveAttribute('role', 'menu');
      expect(mobileMenu).toHaveAttribute('aria-label', 'Menu principal mobile');
    });
  });
});
