import React from 'react';
import { Leaf, Menu, X } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCartUI } from '@/hooks/useCartUI';
import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWishlist } from '@/hooks/useWishlist';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import { DesktopNav } from './navigation/DesktopNav';
import { DesktopActions } from './navigation/DesktopActions';
import { SearchBar } from './navigation/SearchBar';
import { MobileMenu } from './navigation/MobileMenu';

const Navigation = () => {
  const { t } = useTranslation(['common', 'pages']);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const { itemCount } = useCartUI();
  const { user, isLoading, signOut, profile } = useAuth();
  const { wishlistCount } = useWishlist();
  const navigate = useNavigate();
  const location = useLocation();

  // Close mobile menu when resizing to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && isMenuOpen) setIsMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMenuOpen]);

  const currentPath = location.pathname;

  // Close search on route change
  useEffect(() => {
    setShowSearch(false);
  }, [location.pathname]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      setIsMenuOpen(false);
      navigate('/auth');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error(
        t('common:nav.signOutError', 'Erreur lors de la déconnexion')
      );
    }
  }, [signOut, navigate, t]);

  const handleNavClick = useCallback(
    (targetPath: string, e?: React.MouseEvent) => {
      if (currentPath === targetPath) {
        e?.preventDefault();
        toast.info(t('common:messages.alreadyOnPage'), { duration: 2000 });
        return false;
      }
      return true;
    },
    [currentPath, t]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setShowSearch(false);
      setIsMenuOpen(false);
    }
  };

  return (
    <>
      {/* Skip to main content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] bg-primary text-primary-foreground px-4 py-2 rounded-md shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-sm font-medium"
      >
        {t('common:accessibility.skipToContent')}
      </a>

      <header className="header-nav-root sticky top-0 z-header w-full bg-background border-b border-border shadow-sm">
        <div className="w-full max-w-none px-4 sm:px-4 md:px-6 lg:px-8 xl:px-12">
          <div className="flex items-center justify-between h-14 sm:h-16 md:h-16 lg:h-16 w-full gap-2 md:gap-4">
            {/* Logo */}
            <div className="flex items-center flex-shrink-0 min-w-fit w-auto md:w-48 lg:w-52">
              <Link
                to="/"
                className="group flex items-center space-x-2 md:space-x-3 min-w-0"
                onClick={() => setIsMenuOpen(false)}
              >
                <span className="sr-only sm:hidden">
                  {t('common:brand.name')}
                </span>
                <div className="p-2 rounded-full bg-primary group-hover:bg-primary/90 transition-all duration-300 shadow-md group-hover:shadow-lg flex-shrink-0">
                  <Leaf className="h-4 w-4 md:h-5 md:w-5 text-primary-foreground" />
                </div>
                <div className="flex flex-col min-w-0 hidden sm:block">
                  <span className="font-serif text-sm md:text-base lg:text-lg font-semibold text-foreground group-hover:text-primary transition-colors duration-300 whitespace-nowrap">
                    {t('common:brand.name')}
                  </span>
                  <span className="text-xs md:text-xs text-muted-foreground hidden md:block group-hover:text-primary/80 transition-colors duration-300 whitespace-nowrap">
                    {t('common:brand.tagline')}
                  </span>
                </div>
              </Link>
            </div>

            <DesktopNav currentPath={currentPath} onNavClick={handleNavClick} />

            <DesktopActions
              user={user}
              profile={profile}
              isLoading={isLoading}
              itemCount={itemCount}
              wishlistCount={wishlistCount}
              currentPath={currentPath}
              showSearch={showSearch}
              onToggleSearch={() => setShowSearch(!showSearch)}
              onSignOut={handleSignOut}
            />

            {/* Mobile Menu Button */}
            <button
              className={`md:hidden text-foreground hover:text-primary p-1.5 sm:p-2 rounded-md hover:bg-primary/10 transition-all duration-300 touch-manipulation ${isMenuOpen ? 'relative z-mobile-toggle' : ''}`}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={
                isMenuOpen
                  ? t('common:accessibility.closeMenu')
                  : t('common:accessibility.openMenu')
              }
              aria-expanded={isMenuOpen}
              aria-haspopup="true"
              aria-controls="mobile-menu"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6 transition-colors" />
              ) : (
                <Menu className="h-6 w-6 transition-colors" />
              )}
            </button>
          </div>
        </div>

        {showSearch && (
          <SearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSubmit={handleSearch}
            variant="desktop"
          />
        )}
      </header>

      <MobileMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        user={user}
        isLoading={isLoading}
        itemCount={itemCount}
        wishlistCount={wishlistCount}
        currentPath={currentPath}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={handleSearch}
        onNavClick={handleNavClick}
        onSignOut={handleSignOut}
      />
    </>
  );
};

export default Navigation;
