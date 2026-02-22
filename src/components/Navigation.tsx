import React from "react";
import { Leaf, Menu, ShoppingBag, X, User, LogOut, Heart, Package, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useNavigate, useLocation } from "react-router-dom";
import clsx from "clsx";
import { useCartUI } from "@/hooks/useCartUI";
import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWishlist } from "@/hooks/useWishlist";
import CurrencySelector from "@/components/CurrencySelector";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSelector from "@/components/LanguageSelector";
import CompactSettingsMenu from "@/components/CompactSettingsMenu";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const Navigation = () => {
  const { t } = useTranslation(['common', 'pages']);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const { itemCount } = useCartUI();
  const { user, isLoading, signOut } = useAuth();
  const { wishlistCount } = useWishlist();
  const navigate = useNavigate();
  const location = useLocation();

  // Close mobile menu when resizing to desktop breakpoint (md = 768px)
  useEffect(() => {
    const MD_BREAKPOINT = 768; // Tailwind md breakpoint
    const handleResize = () => {
      if (window.innerWidth >= MD_BREAKPOINT && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMenuOpen]);
  const currentPath = location.pathname;

  // Close search dropdown when route changes
  useEffect(() => {
    setShowSearch(false);
  }, [location.pathname]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      setIsMenuOpen(false);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  }, [signOut]);

  // Smart navigation with "already on page" feedback
  const handleNavClick = useCallback((targetPath: string, e?: React.MouseEvent) => {
    if (currentPath === targetPath) {
      e?.preventDefault();
      toast.info(t('common:messages.alreadyOnPage'), { duration: 2000 });
      return false;
    }
    return true;
  }, [currentPath, t]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setShowSearch(false);
      setIsMenuOpen(false);
    }
  };

  return (
    <>
      {/* Skip to main content */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded-md z-50 focus:ring-2 focus:ring-primary/50"
      >
        {t('common:accessibility.skipToContent')}
      </a>
      
      <header className="sticky top-0 z-header w-full bg-background border-b border-border shadow-sm">
        <div className="w-full max-w-none px-4 sm:px-4 md:px-6 lg:px-8 xl:px-12">
          <div className="flex items-center justify-between h-14 sm:h-16 md:h-16 lg:h-16 w-full gap-2 md:gap-4">
            {/* Logo Section */}
            <div className="flex items-center flex-shrink-0 min-w-fit w-auto md:w-48 lg:w-52">
              <Link 
                to="/" 
                className="group flex items-center space-x-2 md:space-x-3 min-w-0"
                aria-label={t('common:brand.name')}
                onClick={() => setIsMenuOpen(false)}
              >
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

            {/* Navigation Links - Desktop & Tablet */}
            <nav className="header-nav hidden md:flex items-center justify-center flex-1 max-w-md lg:max-w-lg xl:max-w-xl mx-2" role="navigation" aria-label={t('common:accessibility.mainNav')}>
              <div className="flex items-center justify-center space-x-2 lg:space-x-3">
                <Link
                  to="/"
                  onClick={(e) => handleNavClick("/", e)}
                  className={clsx(
                    "relative px-3 lg:px-4 py-2 text-sm font-medium transition-all duration-300 hover:text-primary hover:bg-primary/10 rounded-lg whitespace-nowrap touch-manipulation text-center",
                    currentPath === "/" ? "text-primary bg-primary/10" : "text-foreground"
                  )}
                  aria-current={currentPath === "/" ? "page" : undefined}
                >
                  {t('common:nav.home')}
                  {currentPath === "/" && (
                    <span className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full" />
                  )}
                </Link>
                
                <Link
                  to="/products"
                  onClick={(e) => handleNavClick("/products", e)}
                  className={clsx(
                    "relative px-3 lg:px-4 py-2 text-sm font-medium transition-all duration-300 hover:text-primary hover:bg-primary/10 rounded-lg whitespace-nowrap touch-manipulation text-center",
                    currentPath === "/products" ? "text-primary bg-primary/10" : "text-foreground"
                  )}
                  aria-current={currentPath === "/products" ? "page" : undefined}
                >
                  {t('common:nav.shop')}
                  {currentPath === "/products" && (
                    <span className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full" />
                  )}
                </Link>
                
                <Link
                  to="/blog"
                  onClick={(e) => handleNavClick("/blog", e)}
                  className={clsx(
                    "relative px-3 lg:px-4 py-2 text-sm font-medium transition-all duration-300 hover:text-primary hover:bg-primary/10 rounded-lg whitespace-nowrap touch-manipulation text-center",
                    currentPath === "/blog" ? "text-primary bg-primary/10" : "text-foreground"
                  )}
                  aria-current={currentPath === "/blog" ? "page" : undefined}
                >
                  {t('common:nav.blog')}
                  {currentPath === "/blog" && (
                    <span className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full" />
                  )}
                </Link>
                
                <Link
                  to="/contact"
                  onClick={(e) => handleNavClick("/contact", e)}
                  className={clsx(
                    "relative px-3 lg:px-4 py-2 text-sm font-medium transition-all duration-300 hover:text-primary hover:bg-primary/10 rounded-lg whitespace-nowrap touch-manipulation text-center",
                    currentPath === "/contact" ? "text-primary bg-primary/10" : "text-foreground"
                  )}
                  aria-current={currentPath === "/contact" ? "page" : undefined}
                >
                  {t('common:nav.contact')}
                  {currentPath === "/contact" && (
                    <span className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full" />
                  )}
                </Link>
              </div>
            </nav>

            {/* Actions Section - Desktop & Tablet */}
            <div className="flex items-center gap-1 md:gap-2 lg:gap-2 xl:gap-3 flex-shrink-0 w-auto justify-end">
              {/* Search Button - Tablet & Desktop */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSearch(!showSearch)}
                className="hidden md:flex items-center justify-center w-9 h-9 lg:w-10 lg:h-10 hover:bg-primary/10 hover:text-primary rounded-lg transition-all duration-300 touch-manipulation text-foreground"
                aria-label={t('common:nav.search')}
              >
                <Search size={18} className="transition-colors" />
              </Button>

              {/* Wishlist button - Desktop only (hidden on tablet for space) */}
              <Button 
                variant="ghost" 
                size="sm" 
                className="hidden lg:flex relative items-center justify-center w-9 h-9 lg:w-10 lg:h-10 hover:bg-primary/10 rounded-lg transition-all duration-300 touch-manipulation"
                onClick={() => {
                  if (!user) return;
                  if (currentPath === "/wishlist") {
                    toast.info(t('common:messages.alreadyOnPage'), { duration: 2000 });
                  } else {
                    navigate("/wishlist");
                  }
                }}
                disabled={!user}
                aria-label={t('common:nav.wishlist')}
              >
                <span className={clsx(
                  "flex items-center justify-center w-full h-full text-foreground hover:text-primary transition-colors duration-300",
                  !user && "opacity-30"
                )}>
                  <Heart className="h-4 w-4 transition-colors" />
                  {user && wishlistCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[16px] font-medium">
                      {wishlistCount}
                    </span>
                  )}
                </span>
              </Button>

              {/* Language Selector - Desktop only (xl+) */}
              <div className="hidden xl:block">
                <LanguageSelector variant="minimal" />
              </div>

              {/* Compact Settings Menu - Tablet only (md to xl) */}
              <CompactSettingsMenu className="hidden md:flex xl:hidden" />

              {/* Currency Selector - XL Desktop only */}
              <div className="hidden xl:block">
                <CurrencySelector />
              </div>

              {/* Theme Toggle - Desktop only (xl+), hidden on tablet (handled by CompactSettingsMenu) */}
              <ThemeToggle className="hidden xl:flex" />

              {/* Cart Button - Tablet & Desktop */}
              <Link to="/cart" className="hidden md:block">
                <Button
                  variant="outline"
                  size="sm"
                  className={clsx(
                    "border-border transition-all duration-300 flex items-center group relative text-sm px-2 lg:px-3 py-2 rounded-lg hover:shadow-md touch-manipulation font-medium whitespace-nowrap",
                    itemCount >= 1 ? "bg-primary text-primary-foreground border-primary shadow-md" : "bg-background text-foreground hover:bg-primary/10",
                    itemCount >= 1 ? "hover:bg-background hover:text-primary hover:border-primary" : "hover:bg-primary/10 hover:text-primary hover:border-border"
                  )}
                >
                  <ShoppingBag className={clsx("h-4 w-4 transition-colors lg:mr-1", itemCount >= 1 ? "text-primary-foreground group-hover:text-primary" : "text-foreground group-hover:text-primary")} />
                  <span className="hidden lg:inline">({itemCount})</span>
                </Button>
              </Link>

              {/* Auth buttons - Tablet & Desktop */}
              <div className="hidden md:flex items-center gap-1 lg:gap-2">
                {isLoading ? (
                  <div className="flex items-center gap-1">
                    <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-lg bg-muted animate-pulse"></div>
                  </div>
                ) : user ? (
                  <>
                    <Button variant="ghost" size="sm" asChild className="group relative hidden xl:inline-flex hover:bg-primary/10 rounded-lg transition-all duration-300">
                      <Link to="/orders" className="flex items-center justify-center w-9 h-9 lg:w-10 lg:h-10 text-foreground hover:text-primary transition-colors duration-300">
                        <Package className="h-4 w-4 transition-colors" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild className="group relative hover:bg-primary/10 rounded-lg transition-all duration-300 touch-manipulation">
                      <Link to="/profile" className="flex items-center justify-center w-9 h-9 lg:w-10 lg:h-10 text-foreground hover:text-primary transition-colors duration-300">
                        <User className="h-4 w-4 transition-colors" />
                      </Link>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleSignOut} 
                      className="group relative flex items-center justify-center w-9 h-9 lg:w-10 lg:h-10 hidden xl:inline-flex hover:bg-primary/10 text-foreground hover:text-primary rounded-lg transition-all duration-300"
                      aria-label={t('common:nav.logout')}
                    >
                      <LogOut className="h-4 w-4 transition-colors" />
                    </Button>
                  </>
                ) : (
                  <Button variant="ghost" size="sm" asChild className="text-xs lg:text-sm px-2 lg:px-3 py-2 hover:bg-primary/10 hover:text-primary rounded-lg transition-all duration-300 touch-manipulation font-medium whitespace-nowrap">
                    <Link to="/auth">{t('common:nav.login')}</Link>
                  </Button>
                )}
              </div>

              {/* Mobile Menu Button - z-index higher than menu panel when open */}
              <button
                className={`md:hidden text-foreground hover:text-primary p-1.5 sm:p-2 rounded-md hover:bg-primary/10 transition-all duration-300 touch-manipulation ${
                  isMenuOpen ? 'relative z-mobile-toggle' : ''
                }`}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label={isMenuOpen ? t('common:accessibility.closeMenu') : t('common:accessibility.openMenu')}
                aria-expanded={isMenuOpen}
                aria-haspopup="true"
                aria-controls="mobile-menu"
              >
                {isMenuOpen ? <X className="h-6 w-6 transition-colors" /> : <Menu className="h-6 w-6 transition-colors" />}
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar - Desktop & Tablet Dropdown */}
        {showSearch && (
          <div className="absolute top-full left-0 right-0 bg-background border-b border-border shadow-lg z-dropdown hidden md:block">
            <div className="container mx-auto px-4 md:px-6 lg:px-4 py-4 md:py-6 lg:py-4">
              <form onSubmit={handleSearch} className="flex gap-3 md:gap-4 lg:gap-2">
                <Input
                  type="text"
                  placeholder={t('common:nav.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 h-11 md:h-12 lg:h-11 text-base md:text-lg lg:text-base rounded-lg border-border focus:border-primary focus:ring-primary touch-manipulation"
                  autoFocus
                />
                <Button 
                  type="submit" 
                  disabled={!searchQuery.trim()}
                  className="bg-primary hover:bg-primary/90 px-4 md:px-6 lg:px-4 h-11 md:h-12 lg:h-11 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 touch-manipulation"
                >
                  <Search size={18} className="md:w-5 md:h-5 lg:w-[18px] lg:h-[18px]" />
                  <span className="ml-2 text-base md:text-lg lg:text-base font-medium">{t('common:nav.search')}</span>
                </Button>
              </form>
            </div>
          </div>
        )}
      </header>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-foreground/50 z-mobile-overlay"
          onClick={() => setIsMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Menu - Slide in from right - responsive width */}
      <div 
        id="mobile-menu"
        className={`md:hidden fixed top-0 right-0 h-full w-full max-w-xs sm:max-w-sm bg-background shadow-2xl z-mobile-menu transform transition-transform duration-300 ease-out flex flex-col ${
          isMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        {...(!isMenuOpen ? { 'aria-hidden': 'true' as const, tabIndex: -1 } : {})}
        role="menu"
        aria-label={t('common:accessibility.mobileNav')}
      >
        {/* Header with close button */}
        <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-full bg-primary">
              <Leaf className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <span className="font-serif text-lg font-semibold text-foreground">
                {t('common:brand.name')}
              </span>
              <p className="text-sm text-muted-foreground">{t('common:brand.tagline')}</p>
            </div>
          </div>
          {/* Close button */}
          <button
            onClick={() => setIsMenuOpen(false)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors touch-manipulation"
            aria-label={t('common:accessibility.closeMenu')}
            tabIndex={isMenuOpen ? 0 : -1}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto pb-6">
          {/* Search Section */}
          <div className="p-6 border-b border-border">
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                type="text"
                placeholder={t('common:nav.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 rounded-lg"
                tabIndex={isMenuOpen ? 0 : -1}
              />
              <Button 
                type="submit" 
                disabled={!searchQuery.trim()} 
                size="sm"
                className="bg-primary hover:bg-primary/90"
                tabIndex={isMenuOpen ? 0 : -1}
              >
                <Search size={16} />
              </Button>
            </form>
          </div>

          {/* Navigation Links */}
          <div className="px-6 py-4 space-y-2">
            <Link
              to="/"
              className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-200 touch-manipulation ${
                currentPath === "/" 
                  ? "bg-primary text-primary-foreground" 
                  : "text-foreground hover:bg-primary/10 hover:text-primary"
              }`}
              onClick={(e) => {
                if (!handleNavClick("/", e)) return;
                setIsMenuOpen(false);
              }}
              tabIndex={isMenuOpen ? 0 : -1}
            >
              <div className={`p-2 rounded-lg ${currentPath === "/" ? "bg-primary-foreground/20" : "bg-muted"}`}>
                <Leaf className={`h-5 w-5 ${currentPath === "/" ? "text-primary-foreground" : "text-primary"}`} />
              </div>
              <span className="font-medium text-lg">{t('common:nav.home')}</span>
            </Link>

            <Link
              to="/products"
              className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-200 touch-manipulation ${
                currentPath === "/products" 
                  ? "bg-primary text-primary-foreground" 
                  : "text-foreground hover:bg-primary/10 hover:text-primary"
              }`}
              onClick={(e) => {
                if (!handleNavClick("/products", e)) return;
                setIsMenuOpen(false);
              }}
              tabIndex={isMenuOpen ? 0 : -1}
            >
              <div className={`p-2 rounded-lg ${currentPath === "/products" ? "bg-primary-foreground/20" : "bg-muted"}`}>
                <ShoppingBag className={`h-5 w-5 ${currentPath === "/products" ? "text-primary-foreground" : "text-primary"}`} />
              </div>
              <span className="font-medium text-lg">{t('common:nav.shop')}</span>
            </Link>

            <Link
              to="/blog"
              className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-200 touch-manipulation ${
                currentPath === "/blog" 
                  ? "bg-primary text-primary-foreground" 
                  : "text-foreground hover:bg-primary/10 hover:text-primary"
              }`}
              onClick={(e) => {
                if (!handleNavClick("/blog", e)) return;
                setIsMenuOpen(false);
              }}
              tabIndex={isMenuOpen ? 0 : -1}
            >
              <div className={`p-2 rounded-lg ${currentPath === "/blog" ? "bg-primary-foreground/20" : "bg-muted"}`}>
                <Package className={`h-5 w-5 ${currentPath === "/blog" ? "text-primary-foreground" : "text-primary"}`} />
              </div>
              <span className="font-medium text-lg">{t('common:nav.blog')}</span>
            </Link>

            <Link
              to="/contact"
              className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-200 touch-manipulation ${
                currentPath === "/contact" 
                  ? "bg-primary text-primary-foreground" 
                  : "text-foreground hover:bg-primary/10 hover:text-primary"
              }`}
              onClick={(e) => {
                if (!handleNavClick("/contact", e)) return;
                setIsMenuOpen(false);
              }}
              tabIndex={isMenuOpen ? 0 : -1}
            >
              <div className={`p-2 rounded-lg ${currentPath === "/contact" ? "bg-primary-foreground/20" : "bg-muted"}`}>
                <User className={`h-5 w-5 ${currentPath === "/contact" ? "text-primary-foreground" : "text-primary"}`} />
              </div>
              <span className="font-medium text-lg">{t('common:nav.contact')}</span>
            </Link>
          </div>

          {/* User Actions Section */}
          <div className="px-6 py-4 border-t border-border">
            {/* Cart Button */}
            <Link
              to="/cart"
              className="block mb-4"
              onClick={() => setIsMenuOpen(false)}
              tabIndex={isMenuOpen ? 0 : -1}
            >
              <Button
                className={`w-full flex items-center justify-center gap-3 py-4 rounded-xl font-medium text-lg transition-all duration-200 ${
                  itemCount >= 1
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/30"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
                tabIndex={isMenuOpen ? 0 : -1}
              >
                <ShoppingBag className="h-5 w-5" />
                <span>{t('common:nav.cart')} {itemCount > 0 && `(${itemCount})`}</span>
              </Button>
            </Link>

            {/* Auth Section */}
            {!isLoading && (
              <div className="space-y-3">
                {user ? (
                  <>
                    {/* User Info */}
                    <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                      <div className="p-2 bg-primary rounded-full">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <span className="text-sm font-medium text-secondary-foreground">{t('auth:messages.loggedIn')}</span>
                    </div>

                    {/* User Menu Items */}
                    <div className="space-y-2">
                      <Link
                        to="/profile"
                        className="flex items-center gap-3 p-3 text-foreground hover:bg-muted rounded-lg transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                        tabIndex={isMenuOpen ? 0 : -1}
                      >
                        <User className="h-5 w-5" />
                        <span>{t('common:nav.profile')}</span>
                      </Link>

                      <Link
                        to="/orders"
                        className="flex items-center gap-3 p-3 text-foreground hover:bg-muted rounded-lg transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                        tabIndex={isMenuOpen ? 0 : -1}
                      >
                        <Package className="h-5 w-5" />
                        <span>{t('common:nav.orders')}</span>
                      </Link>

                      <button
                        className="flex items-center justify-between p-3 text-foreground hover:bg-muted rounded-lg transition-colors w-full"
                        onClick={() => {
                          setIsMenuOpen(false);
                          if (currentPath === "/wishlist") {
                            toast.info(t('common:messages.alreadyOnPage'), { duration: 2000 });
                          } else {
                            navigate("/wishlist");
                          }
                        }}
                        tabIndex={isMenuOpen ? 0 : -1}
                      >
                        <div className="flex items-center gap-3">
                          <Heart className="h-5 w-5" />
                          <span>{t('common:nav.wishlist')}</span>
                        </div>
                        {wishlistCount > 0 && (
                          <span className="bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                            {wishlistCount}
                          </span>
                        )}
                      </button>

                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 w-full p-3 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        tabIndex={isMenuOpen ? 0 : -1}
                      >
                        <LogOut className="h-5 w-5" />
                        <span>{t('common:nav.logout')}</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <Button 
                    variant="default" 
                    asChild 
                    className="w-full py-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                    tabIndex={isMenuOpen ? 0 : -1}
                  >
                    <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                      <User className="mr-2 h-5 w-5" />
                      {t('common:nav.login')}
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Settings Section */}
          <div className="px-6 py-4 border-t border-border space-y-4">
            {/* Language Selector */}
            <div className="flex items-center justify-between">
              <span className="text-foreground font-medium">{t('common:language.label')}:</span>
              <LanguageSelector variant="minimal" />
            </div>
            
            {/* Theme Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-foreground font-medium">{t('common:theme.label')}:</span>
              <ThemeToggle />
            </div>
            
            {/* Currency Selector */}
            <div className="flex items-center justify-between">
              <span className="text-foreground font-medium">{t('common:currency.label')}:</span>
              <div tabIndex={isMenuOpen ? 0 : -1}>
                <CurrencySelector />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navigation;
