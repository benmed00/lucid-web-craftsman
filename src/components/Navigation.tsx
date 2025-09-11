
import React from "react";
import { Leaf, Menu, ShoppingBag, X, User, LogOut, Heart, ShoppingCart, Package, Search } from "lucide-react";
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
      {/* Skip to main content - accessibility best practice */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-olive-700 text-white px-4 py-2 rounded-md z-50 focus:ring-2 focus:ring-olive-300"
      >
        Aller au contenu principal
      </a>
      
      <header className="sticky top-0 z-40 w-full bg-white border-b border-stone-200 shadow-sm">
        <div className="w-full max-w-none px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 w-full min-w-0">
            {/* Logo Section - Fixed width */}
            <div className="flex items-center flex-shrink-0 w-48">
              <Link 
                to="/" 
                className="group flex items-center space-x-3"
                onClick={() => {
                  console.log('Logo clicked, navigating to home');
                  setIsMenuOpen(false);
                }}
              >
                <div className="p-2 rounded-full bg-olive-700 group-hover:bg-olive-800 transition-colors duration-200">
                  <Leaf className="h-5 w-5 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="font-serif text-xl font-semibold text-stone-800 group-hover:text-olive-700 transition-colors duration-200 whitespace-nowrap">
                    Rif Raw Straw
                  </span>
                  <span className="text-xs text-stone-500 hidden sm:block group-hover:text-olive-600 transition-colors duration-200 whitespace-nowrap">
                    Artisanat Berbère
                  </span>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation Links - Fixed center section */}
            <nav className="hidden md:flex items-center justify-center flex-1" role="navigation" aria-label="Navigation principale">
              <div className="flex items-center space-x-8">
                <Link
                  to="/"
                  className={clsx(
                    "relative px-4 py-2 text-sm font-medium transition-colors duration-150 hover:text-olive-700 whitespace-nowrap",
                    currentPath === "/" 
                      ? "text-olive-700 font-semibold" 
                      : "text-stone-700"
                  )}
                  aria-current={currentPath === "/" ? "page" : undefined}
                  onClick={() => console.log('Accueil clicked')}
                >
                  Accueil
                  {currentPath === "/" && (
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-olive-700 rounded-full" />
                  )}
                </Link>
                
                <Link
                  to="/products"
                  className={clsx(
                    "relative px-4 py-2 text-sm font-medium transition-colors duration-150 hover:text-olive-700 whitespace-nowrap",
                    currentPath === "/products" 
                      ? "text-olive-700 font-semibold" 
                      : "text-stone-700"
                  )}
                  aria-current={currentPath === "/products" ? "page" : undefined}
                  onClick={() => console.log('Boutique clicked')}
                >
                  Boutique
                  {currentPath === "/products" && (
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-olive-700 rounded-full" />
                  )}
                </Link>
                
                <Link
                  to="/blog"
                  className={clsx(
                    "relative px-4 py-2 text-sm font-medium transition-colors duration-150 hover:text-olive-700 whitespace-nowrap",
                    currentPath === "/blog" 
                      ? "text-olive-700 font-semibold" 
                      : "text-stone-700"
                  )}
                  aria-current={currentPath === "/blog" ? "page" : undefined}
                  onClick={() => console.log('Blog clicked')}
                >
                  Blog
                  {currentPath === "/blog" && (
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-olive-700 rounded-full" />
                  )}
                </Link>
                
                <Link
                  to="/contact"
                  className={clsx(
                    "relative px-4 py-2 text-sm font-medium transition-colors duration-150 hover:text-olive-700 whitespace-nowrap",
                    currentPath === "/contact" 
                      ? "text-olive-700 font-semibold" 
                      : "text-stone-700"
                  )}
                  aria-current={currentPath === "/contact" ? "page" : undefined}
                  onClick={() => console.log('Contact clicked')}
                >
                  Contact
                  {currentPath === "/contact" && (
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-olive-700 rounded-full" />
                  )}
                </Link>
              </div>
            </nav>

            {/* Actions Section - Fixed width */}
            <div className="flex items-center space-x-4 flex-shrink-0 w-48 justify-end">
              {/* Search Button - Desktop */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSearch(!showSearch)}
                className="relative hidden md:flex items-center gap-2 group"
              >
                <Search size={18} />
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-stone-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  Rechercher
                </div>
              </Button>

              {/* Wishlist button - Desktop */}
              {user && (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="relative hidden md:flex items-center gap-2"
                >
                  <Link to="/wishlist">
                    <Heart size={18} />
                    {wishlistCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {wishlistCount}
                      </span>
                    )}
                  </Link>
                </Button>
              )}

              {/* Currency Selector - Desktop */}
              <div className="hidden md:block">
                <CurrencySelector />
              </div>

              <Link to="/cart" className="hidden md:block">
                <Button
                  variant="outline"
                  className={clsx(
                    "border-stone-300 transition-colors flex items-center group relative",
                    itemCount >= 1
                      ? "bg-olive-700 text-white"
                      : "bg-white text-stone-700",
                    itemCount >= 1
                      ? "hover:bg-white hover:text-olive-700"
                      : "hover:bg-white hover:text-stone-900"
                  )}
                >
                  <ShoppingBag className={clsx("h-4 w-4 transition-colors", itemCount >= 1 ? "text-white group-hover:text-olive-700" : "text-stone-700 group-hover:text-stone-900")} />
                  <span className="ml-2">({itemCount})</span>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-stone-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Panier
                  </div>
                </Button>
              </Link>

              {/* Auth buttons - Desktop */}
              <div className="hidden md:flex items-center gap-1">
                {isLoading ? (
                  <div className="flex items-center gap-1">
                    <div className="w-8 h-8 rounded bg-stone-200"></div>
                    <div className="w-8 h-8 rounded bg-stone-200"></div>
                    <div className="w-8 h-8 rounded bg-stone-200"></div>
                  </div>
                ) : user ? (
                  <>
                    <Button variant="ghost" size="sm" asChild className="group relative">
                      <Link to="/orders" className="flex items-center p-2">
                        <Package className="h-4 w-4" />
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-stone-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          Mes Commandes
                        </div>
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild className="group relative">
                      <Link to="/profile" className="flex items-center p-2">
                        <User className="h-4 w-4" />
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-stone-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          Mon Profil
                        </div>
                      </Link>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleSignOut} 
                      className="group relative flex items-center p-2"
                      id="nav-signout"
                      name="navigation-signout-button"
                    >
                      <LogOut className="h-4 w-4" />
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-stone-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        Déconnexion
                      </div>
                    </Button>
                  </>
                ) : (
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/auth" aria-label="Se connecter">Se connecter</Link>
                  </Button>
                )}
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden text-stone-700 p-2 rounded-md hover:bg-stone-100 transition-colors duration-200"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
              aria-expanded={isMenuOpen}
              aria-haspopup="true"
              aria-controls="mobile-menu"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

      {/* Search Bar - Desktop Dropdown */}
      {showSearch && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-stone-200 shadow-lg z-30 hidden md:block">
          <div className="container mx-auto px-4 py-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                type="text"
                placeholder="Rechercher des produits..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
                autoFocus
              />
              <Button type="submit" disabled={!searchQuery.trim()}>
                <Search size={18} />
                <span className="ml-2">Rechercher</span>
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Menu */}
      <div 
        id="mobile-menu"
        className={`md:hidden absolute top-full left-0 right-0 bg-white shadow-xl z-50 border-t border-stone-100 transform transition-transform duration-200 ease-out max-h-[90vh] overflow-y-auto ${isMenuOpen ? 'translate-y-0' : '-translate-y-full'}`}
        aria-hidden={!isMenuOpen}
        role="menu"
      >
        <div className="flex flex-col space-y-3 p-6 pb-8">
          {/* Mobile Search */}
          <div className="mb-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                type="text"
                placeholder="Rechercher des produits..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={!searchQuery.trim()} size="sm">
                <Search size={16} />
              </Button>
            </form>
          </div>

          <Link
            to="/"
            className="text-stone-700 hover:text-olive-700 hover:bg-olive-50 transition-colors duration-150 py-5 px-5 rounded-xl font-medium flex items-center gap-4 touch-manipulation min-h-[56px]"
            onClick={() => setIsMenuOpen(false)}
          >
            <span className="text-2xl">🏠</span>
            <span className="text-lg">Accueil</span>
          </Link>
          <Link
            to="/products"
            className="text-stone-700 hover:text-olive-700 hover:bg-olive-50 transition-colors duration-150 py-5 px-5 rounded-xl font-medium flex items-center gap-4 touch-manipulation min-h-[56px]"
            onClick={() => setIsMenuOpen(false)}
          >
            <span className="text-2xl">🛍️</span>
            <span className="text-lg">Boutique</span>
          </Link>
          <Link
            to="/blog"
            className="text-stone-700 hover:text-olive-700 hover:bg-olive-50 transition-colors duration-150 py-5 px-5 rounded-xl font-medium flex items-center gap-4 touch-manipulation min-h-[56px]"
            onClick={() => setIsMenuOpen(false)}
          >
            <span className="text-2xl">📖</span>
            <span className="text-lg">Blog</span>
          </Link>
          <Link
            to="/contact"
            className="text-stone-700 hover:text-olive-700 hover:bg-olive-50 transition-colors duration-150 py-5 px-5 rounded-xl font-medium flex items-center gap-4 touch-manipulation min-h-[56px]"
            onClick={() => setIsMenuOpen(false)}
          >
            <span className="text-2xl">💬</span>
            <span className="text-lg">Contact</span>
          </Link>

          {/* Currency Selector - Mobile */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-stone-700 font-medium">Devise:</span>
              <CurrencySelector />
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-stone-200">
            <Link
              to="/cart"
              className="w-full block"
              onClick={() => setIsMenuOpen(false)}
            >
              <Button
                className={clsx(
                  "w-full transition-all duration-200 flex items-center justify-center py-4 rounded-xl active:scale-[0.98] hover:shadow-lg",
                  itemCount >= 1
                    ? "bg-olive-700 text-white hover:bg-olive-800 shadow-olive-700/30"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                )}
              >
                <ShoppingBag className="mr-3 h-5 w-5" /> 
                <span className="font-medium">Panier {itemCount > 0 && `(${itemCount})`}</span>
              </Button>
            </Link>
          </div>

          {/* Mobile auth buttons */}
          {!isLoading && (
            <>
            {user && (
              <>
                <Link
                  to="/wishlist"
                  className="flex items-center justify-between py-3 px-4 text-stone-700 hover:bg-olive-50 rounded-lg transition-colors relative"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className="flex items-center">
                    <Heart size={20} className="mr-3" />
                    Mes Favoris
                  </span>
                  {wishlistCount > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {wishlistCount}
                    </span>
                  )}
                </Link>
                 <Link
                   to="/orders"
                   className="flex items-center py-3 px-4 text-stone-700 hover:bg-olive-50 rounded-lg transition-colors"
                   onClick={() => setIsMenuOpen(false)}
                 >
                   <Package size={20} className="mr-3" />
                   Mes Commandes
                 </Link>
                 <Link
                   to="/cart"
                   className="flex items-center py-3 px-4 text-stone-700 hover:bg-olive-50 rounded-lg transition-colors"
                   onClick={() => setIsMenuOpen(false)}
                 >
                   <ShoppingCart size={20} className="mr-3" />
                   Panier
                 </Link>
              </>
            )}

            {user ? (
                <div className="pt-4 mt-4 border-t border-stone-200 space-y-3">
                  <Link to="/profile" onClick={() => setIsMenuOpen(false)}>
                    <div className="px-4 py-3 bg-olive-50 rounded-xl hover:bg-olive-100 active:bg-olive-200 transition-all duration-200 cursor-pointer">
                      <div className="flex items-center gap-3 text-olive-700 font-medium">
                        <User className="h-5 w-5" />
                        <span>👤 Mon Profil</span>
                      </div>
                    </div>
                  </Link>
                  <Button 
                    variant="outline" 
                    onClick={handleSignOut} 
                    className="w-full flex items-center justify-center gap-3 py-4 rounded-xl hover:shadow-lg active:scale-[0.98] transition-all duration-200"
                  >
                    <LogOut className="h-5 w-5" />
                    <span className="font-medium">Déconnexion</span>
                  </Button>
                </div>
              ) : (
                <div className="pt-4 mt-4 border-t border-stone-200">
                  <Button variant="default" asChild className="w-full py-4 rounded-xl hover:shadow-lg active:scale-[0.98] transition-all duration-200">
                    <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                      <span className="font-medium">Se connecter</span>
                    </Link>
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      </header>
    </>
  );
};

export default Navigation;
