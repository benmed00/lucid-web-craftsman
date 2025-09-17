import React from "react";
import { Leaf, Menu, ShoppingBag, X, User, LogOut, Heart, Package, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useNavigate, useLocation } from "react-router-dom";
import clsx from "clsx";
import { useCartUI } from "../context/useCartUI";
import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWishlist } from "@/hooks/useWishlist";
import CurrencySelector from "@/components/CurrencySelector";

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const { itemCount } = useCartUI();
  const { user, isLoading, signOut } = useAuth();
  const { wishlistCount } = useWishlist();
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = location.pathname;

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      setIsMenuOpen(false);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  }, [signOut]);

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
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-olive-700 text-white px-4 py-2 rounded-md z-50 focus:ring-2 focus:ring-olive-300"
      >
        Aller au contenu principal
      </a>
      
      <header className="sticky top-0 z-50 w-full bg-white border-b border-stone-200 shadow-sm">
        <div className="w-full max-w-none px-3 sm:px-4 md:px-6 lg:px-6 xl:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 md:h-18 lg:h-16 w-full min-w-0">
            {/* Logo Section */}
            <div className="flex items-center flex-shrink-0 min-w-0 md:max-w-[160px] lg:max-w-[200px] xl:w-52">
              <Link 
                to="/" 
                className="group flex items-center space-x-1 sm:space-x-2 md:space-x-2 lg:space-x-3 min-w-0"
                aria-label="Retour à l'accueil"
                onClick={() => setIsMenuOpen(false)}
              >
                <div className="p-1.5 md:p-2 lg:p-2 rounded-full bg-olive-700 group-hover:bg-olive-800 transition-all duration-300 shadow-md group-hover:shadow-lg flex-shrink-0">
                  <Leaf className="h-4 w-4 md:h-5 md:w-5 lg:h-5 lg:w-5 text-white" />
                </div>
                <div className="flex flex-col min-w-0 hidden sm:block">
                  <span className="font-serif text-sm md:text-base lg:text-lg xl:text-xl font-semibold text-stone-800 group-hover:text-olive-700 transition-colors duration-300 whitespace-nowrap truncate">
                    Rif Raw Straw
                  </span>
                  <span className="text-xs md:text-xs lg:text-sm text-stone-500 hidden md:block group-hover:text-olive-600 transition-colors duration-300 whitespace-nowrap">
                    Artisanat Berbère
                  </span>
                </div>
              </Link>
            </div>

            {/* Navigation Links - Desktop & Tablet */}
            <nav className="hidden md:flex items-center justify-center flex-1 px-2 md:px-4 lg:px-4 min-w-0" role="navigation" aria-label="Navigation principale">
              <div className="flex items-center space-x-1 md:space-x-3 lg:space-x-4 xl:space-x-6">
                <Link
                  to="/"
                  className={clsx(
                    "relative px-2 md:px-4 lg:px-3 xl:px-4 py-2 md:py-3 lg:py-2 text-sm md:text-base lg:text-sm font-medium transition-all duration-300 hover:text-olive-700 hover:bg-olive-50 rounded-lg md:rounded-xl lg:rounded-lg whitespace-nowrap touch-manipulation",
                    currentPath === "/" ? "text-olive-700 bg-olive-50" : "text-stone-700"
                  )}
                  aria-current={currentPath === "/" ? "page" : undefined}
                >
                  Accueil
                  {currentPath === "/" && (
                    <span className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-olive-700 rounded-full" />
                  )}
                </Link>
                
                <Link
                  to="/products"
                  className={clsx(
                    "relative px-2 md:px-4 lg:px-3 xl:px-4 py-2 md:py-3 lg:py-2 text-sm md:text-base lg:text-sm font-medium transition-all duration-300 hover:text-olive-700 hover:bg-olive-50 rounded-lg md:rounded-xl lg:rounded-lg whitespace-nowrap touch-manipulation",
                    currentPath === "/products" ? "text-olive-700 bg-olive-50" : "text-stone-700"
                  )}
                  aria-current={currentPath === "/products" ? "page" : undefined}
                >
                  Boutique
                  {currentPath === "/products" && (
                    <span className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-olive-700 rounded-full" />
                  )}
                </Link>
                
                <Link
                  to="/blog"
                  className={clsx(
                    "relative px-2 md:px-4 lg:px-3 xl:px-4 py-2 md:py-3 lg:py-2 text-sm md:text-base lg:text-sm font-medium transition-all duration-300 hover:text-olive-700 hover:bg-olive-50 rounded-lg md:rounded-xl lg:rounded-lg whitespace-nowrap touch-manipulation",
                    currentPath === "/blog" ? "text-olive-700 bg-olive-50" : "text-stone-700"
                  )}
                  aria-current={currentPath === "/blog" ? "page" : undefined}
                >
                  Blog
                  {currentPath === "/blog" && (
                    <span className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-olive-700 rounded-full" />
                  )}
                </Link>
                
                <Link
                  to="/contact"
                  className={clsx(
                    "relative px-2 md:px-4 lg:px-3 xl:px-4 py-2 md:py-3 lg:py-2 text-sm md:text-base lg:text-sm font-medium transition-all duration-300 hover:text-olive-700 hover:bg-olive-50 rounded-lg md:rounded-xl lg:rounded-lg whitespace-nowrap touch-manipulation",
                    currentPath === "/contact" ? "text-olive-700 bg-olive-50" : "text-stone-700"
                  )}
                  aria-current={currentPath === "/contact" ? "page" : undefined}
                >
                  Contact
                  {currentPath === "/contact" && (
                    <span className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-olive-700 rounded-full" />
                  )}
                </Link>
              </div>
            </nav>

            {/* Actions Section - Desktop & Tablet */}
            <div className="flex items-center space-x-1 sm:space-x-1 md:space-x-2 lg:space-x-3 xl:space-x-4 flex-shrink-0 justify-end min-w-[140px] md:min-w-[180px] lg:min-w-[200px]">
              {/* Search Button - Tablet & Desktop */}
              <div className="hidden md:flex w-10 md:w-12 lg:w-10 h-10 md:h-12 lg:h-8 items-center justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSearch(!showSearch)}
                  className="relative flex items-center gap-2 group w-10 md:w-12 lg:w-10 h-10 md:h-12 lg:h-8 hover:bg-olive-50 rounded-lg transition-all duration-300 touch-manipulation"
                >
                  <Search size={18} className="md:w-5 md:h-5 lg:w-[18px] lg:h-[18px]" />
                </Button>
              </div>

              {/* Wishlist button - Tablet & Desktop */}
              <div className="hidden md:flex w-10 md:w-12 lg:w-8 h-10 md:h-12 lg:h-8 items-center justify-center">
                <Button variant="ghost" size="sm" asChild className="relative flex items-center justify-center w-10 md:w-12 lg:w-8 h-10 md:h-12 lg:h-8 p-0 hover:bg-olive-50 rounded-lg transition-all duration-300 touch-manipulation">
                  <Link
                    to={user ? "/wishlist" : "#"}
                    className={clsx(
                      "flex items-center justify-center w-10 md:w-12 lg:w-8 h-10 md:h-12 lg:h-8",
                      !user && "pointer-events-none opacity-30"
                    )}
                  >
                    <Heart className="h-4 w-4 md:h-5 md:w-5 lg:h-4 lg:w-4" />
                    {user && wishlistCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 md:h-6 md:w-6 lg:h-4 lg:w-4 flex items-center justify-center min-w-[16px] font-medium">
                        {wishlistCount}
                      </span>
                    )}
                  </Link>
                </Button>
              </div>

              {/* Currency Selector - Desktop */}
              <div className="hidden lg:block">
                <CurrencySelector />
              </div>

              {/* Cart Button - Tablet & Desktop */}
              <Link to="/cart" className="hidden md:block">
                <Button
                  variant="outline"
                  size="sm"
                  className={clsx(
                    "border-stone-300 transition-all duration-300 flex items-center group relative text-sm md:text-base lg:text-sm px-3 md:px-4 lg:px-3 py-2 md:py-3 lg:py-2 rounded-lg hover:shadow-md touch-manipulation",
                    itemCount >= 1 ? "bg-olive-700 text-white border-olive-700 shadow-md" : "bg-white text-stone-700 hover:bg-olive-50",
                    itemCount >= 1 ? "hover:bg-white hover:text-olive-700 hover:border-olive-700" : "hover:bg-olive-50 hover:text-olive-700 hover:border-olive-300"
                  )}
                >
                  <ShoppingBag className={clsx("h-4 w-4 md:h-5 md:w-5 lg:h-4 lg:w-4 transition-colors", itemCount >= 1 ? "text-white group-hover:text-olive-700" : "text-stone-700 group-hover:text-olive-700")} />
                  <span className="ml-2 font-medium">({itemCount})</span>
                </Button>
              </Link>

              {/* Auth buttons - Tablet & Desktop */}
              <div className="hidden md:flex items-center gap-1 md:gap-2 lg:gap-1">
                {isLoading ? (
                  <div className="flex items-center gap-1">
                    <div className="w-8 h-8 md:w-10 md:h-10 lg:w-8 lg:h-8 rounded-lg bg-stone-200 animate-pulse"></div>
                    <div className="w-8 h-8 md:w-10 md:h-10 lg:w-8 lg:h-8 rounded-lg bg-stone-200 animate-pulse hidden lg:block"></div>
                    <div className="w-8 h-8 md:w-10 md:h-10 lg:w-8 lg:h-8 rounded-lg bg-stone-200 animate-pulse hidden lg:block"></div>
                  </div>
                ) : user ? (
                  <>
                    <Button variant="ghost" size="sm" asChild className="group relative hidden lg:inline-flex hover:bg-olive-50 rounded-lg transition-all duration-300">
                      <Link to="/orders" className="flex items-center p-2">
                        <Package className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild className="group relative hover:bg-olive-50 rounded-lg transition-all duration-300 touch-manipulation">
                      <Link to="/profile" className="flex items-center p-2 md:p-3 lg:p-2">
                        <User className="h-4 w-4 md:h-5 md:w-5 lg:h-4 lg:w-4" />
                      </Link>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleSignOut} 
                      className="group relative flex items-center p-2 hidden lg:inline-flex hover:bg-olive-50 rounded-lg transition-all duration-300"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <Button variant="ghost" size="sm" asChild className="text-sm md:text-base lg:text-sm px-3 md:px-4 lg:px-3 py-2 md:py-3 lg:py-2 hover:bg-olive-50 rounded-lg transition-all duration-300 touch-manipulation">
                    <Link to="/auth" aria-label="Se connecter">Se connecter</Link>
                  </Button>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                className="md:hidden text-stone-700 p-1.5 sm:p-2 rounded-md hover:bg-stone-100 transition-colors duration-200 touch-manipulation"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label={isMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
                aria-expanded={isMenuOpen}
                aria-haspopup="true"
                aria-controls="mobile-menu"
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar - Desktop & Tablet Dropdown */}
        {showSearch && (
          <div className="absolute top-full left-0 right-0 bg-white border-b border-stone-200 shadow-lg z-[45] hidden md:block">
            <div className="container mx-auto px-4 md:px-6 lg:px-4 py-4 md:py-6 lg:py-4">
              <form onSubmit={handleSearch} className="flex gap-3 md:gap-4 lg:gap-2">
                <Input
                  type="text"
                  placeholder="Rechercher des produits..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 h-11 md:h-12 lg:h-11 text-base md:text-lg lg:text-base rounded-lg border-stone-300 focus:border-olive-500 focus:ring-olive-500 touch-manipulation"
                  autoFocus
                />
                <Button 
                  type="submit" 
                  disabled={!searchQuery.trim()}
                  className="bg-olive-700 hover:bg-olive-800 px-4 md:px-6 lg:px-4 h-11 md:h-12 lg:h-11 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 touch-manipulation"
                >
                  <Search size={18} className="md:w-5 md:h-5 lg:w-[18px] lg:h-[18px]" />
                  <span className="ml-2 text-base md:text-lg lg:text-base font-medium">Rechercher</span>
                </Button>
              </form>
            </div>
          </div>
        )}
      </header>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-[55]"
          onClick={() => setIsMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Menu - Slide in from right */}
      <div 
        id="mobile-menu"
        className={`md:hidden fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-[56] transform transition-transform duration-300 ease-out ${
          isMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden={!isMenuOpen}
        role="menu"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-200">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-full bg-olive-700">
              <Leaf className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="font-serif text-lg font-semibold text-stone-800">
                Rif Raw Straw
              </span>
              <p className="text-sm text-stone-500">Artisanat Berbère</p>
            </div>
          </div>
          <button
            onClick={() => setIsMenuOpen(false)}
            className="p-2 rounded-full hover:bg-stone-100 transition-colors"
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5 text-stone-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col h-full overflow-y-auto pb-6">
          {/* Search Section */}
          <div className="p-6 border-b border-stone-100">
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 rounded-lg"
                tabIndex={isMenuOpen ? 0 : -1}
              />
              <Button 
                type="submit" 
                disabled={!searchQuery.trim()} 
                size="sm"
                className="bg-olive-700 hover:bg-olive-800"
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
                  ? "bg-olive-700 text-white" 
                  : "text-stone-700 hover:bg-olive-50 hover:text-olive-700"
              }`}
              onClick={() => setIsMenuOpen(false)}
              tabIndex={isMenuOpen ? 0 : -1}
            >
              <div className={`p-2 rounded-lg ${currentPath === "/" ? "bg-white/20" : "bg-stone-100"}`}>
                <Leaf className={`h-5 w-5 ${currentPath === "/" ? "text-white" : "text-olive-700"}`} />
              </div>
              <span className="font-medium text-lg">Accueil</span>
            </Link>

            <Link
              to="/products"
              className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-200 touch-manipulation ${
                currentPath === "/products" 
                  ? "bg-olive-700 text-white" 
                  : "text-stone-700 hover:bg-olive-50 hover:text-olive-700"
              }`}
              onClick={() => setIsMenuOpen(false)}
              tabIndex={isMenuOpen ? 0 : -1}
            >
              <div className={`p-2 rounded-lg ${currentPath === "/products" ? "bg-white/20" : "bg-stone-100"}`}>
                <ShoppingBag className={`h-5 w-5 ${currentPath === "/products" ? "text-white" : "text-olive-700"}`} />
              </div>
              <span className="font-medium text-lg">Boutique</span>
            </Link>

            <Link
              to="/blog"
              className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-200 touch-manipulation ${
                currentPath === "/blog" 
                  ? "bg-olive-700 text-white" 
                  : "text-stone-700 hover:bg-olive-50 hover:text-olive-700"
              }`}
              onClick={() => setIsMenuOpen(false)}
              tabIndex={isMenuOpen ? 0 : -1}
            >
              <div className={`p-2 rounded-lg ${currentPath === "/blog" ? "bg-white/20" : "bg-stone-100"}`}>
                <Package className={`h-5 w-5 ${currentPath === "/blog" ? "text-white" : "text-olive-700"}`} />
              </div>
              <span className="font-medium text-lg">Blog</span>
            </Link>

            <Link
              to="/contact"
              className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-200 touch-manipulation ${
                currentPath === "/contact" 
                  ? "bg-olive-700 text-white" 
                  : "text-stone-700 hover:bg-olive-50 hover:text-olive-700"
              }`}
              onClick={() => setIsMenuOpen(false)}
              tabIndex={isMenuOpen ? 0 : -1}
            >
              <div className={`p-2 rounded-lg ${currentPath === "/contact" ? "bg-white/20" : "bg-stone-100"}`}>
                <User className={`h-5 w-5 ${currentPath === "/contact" ? "text-white" : "text-olive-700"}`} />
              </div>
              <span className="font-medium text-lg">Contact</span>
            </Link>
          </div>

          {/* User Actions Section */}
          <div className="px-6 py-4 border-t border-stone-100">
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
                    ? "bg-olive-700 text-white hover:bg-olive-800 shadow-lg shadow-olive-700/30"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                }`}
                tabIndex={isMenuOpen ? 0 : -1}
              >
                <ShoppingBag className="h-5 w-5" />
                <span>Panier {itemCount > 0 && `(${itemCount})`}</span>
              </Button>
            </Link>

            {/* Auth Section */}
            {!isLoading && (
              <div className="space-y-3">
                {user ? (
                  <>
                    {/* User Info */}
                    <div className="flex items-center gap-3 p-3 bg-olive-50 rounded-lg">
                      <div className="p-2 bg-olive-700 rounded-full">
                        <User className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-sm font-medium text-olive-800">Connecté</span>
                    </div>

                    {/* User Menu Items */}
                    <div className="space-y-2">
                      <Link
                        to="/profile"
                        className="flex items-center gap-3 p-3 text-stone-700 hover:bg-stone-50 rounded-lg transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                        tabIndex={isMenuOpen ? 0 : -1}
                      >
                        <User className="h-5 w-5" />
                        <span>Mon Profil</span>
                      </Link>

                      <Link
                        to="/orders"
                        className="flex items-center gap-3 p-3 text-stone-700 hover:bg-stone-50 rounded-lg transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                        tabIndex={isMenuOpen ? 0 : -1}
                      >
                        <Package className="h-5 w-5" />
                        <span>Mes Commandes</span>
                      </Link>

                      <Link
                        to="/wishlist"
                        className="flex items-center justify-between p-3 text-stone-700 hover:bg-stone-50 rounded-lg transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                        tabIndex={isMenuOpen ? 0 : -1}
                      >
                        <div className="flex items-center gap-3">
                          <Heart className="h-5 w-5" />
                          <span>Mes Favoris</span>
                        </div>
                        {wishlistCount > 0 && (
                          <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                            {wishlistCount}
                          </span>
                        )}
                      </Link>

                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 w-full p-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        tabIndex={isMenuOpen ? 0 : -1}
                      >
                        <LogOut className="h-5 w-5" />
                        <span>Déconnexion</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <Button 
                    variant="default" 
                    asChild 
                    className="w-full py-4 rounded-xl bg-olive-700 hover:bg-olive-800 text-white font-medium"
                    tabIndex={isMenuOpen ? 0 : -1}
                  >
                    <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                      <User className="mr-2 h-5 w-5" />
                      Se connecter
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Currency Selector */}
          <div className="px-6 py-4 border-t border-stone-100">
            <div className="flex items-center justify-between">
              <span className="text-stone-700 font-medium">Devise:</span>
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