
import React from "react";
import { Leaf, Menu, ShoppingBag, X, User, LogOut, Heart, ShoppingCart, Package, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useNavigate, useLocation } from "react-router-dom";
import clsx from "clsx";
import { useCartUI } from "../context/useCartUI";
import { useState, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWishlist } from "@/hooks/useWishlist";
import CurrencySelector from "@/components/CurrencySelector";
import "../styles/header-nav-fix.css";

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const { itemCount } = useCartUI();
  const { user, isLoading, signOut } = useAuth();
  const { wishlistCount } = useWishlist();
  const navigate = useNavigate();
  const location = useLocation();

  // Memoize current path to prevent unnecessary re-renders
  const currentPath = useMemo(() => location.pathname, [location.pathname]);

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
      
      <header className="header-nav-root">
      <div className="header-nav-container">
        {/* Logo Section */}
        <div className="header-logo">
          <Link to="/" className="group">
            <div className="flex items-center space-x-2 md:space-x-3">
              <div className="p-1.5 md:p-2 rounded-full bg-olive-700 group-hover:bg-olive-800 transition-all duration-300 shadow-md group-hover:shadow-lg">
                <Leaf className="h-4 w-4 md:h-5 md:w-5 text-white drop-shadow-sm" />
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-lg md:text-xl font-semibold text-stone-800 leading-tight group-hover:text-olive-700 transition-colors">
                  Rif Raw Straw
                </span>
                <span className="text-xs text-stone-500 leading-tight hidden sm:block group-hover:text-olive-600 transition-colors">
                  Artisanat Berbère
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation Links - Semantic Markup */}
        <nav className="header-nav" role="navigation" aria-label="Navigation principale">
          <ul>
            <li>
              <Link
                to="/"
                aria-current={currentPath === "/" ? "page" : undefined}
              >
                Accueil
              </Link>
            </li>
            <li>
              <Link
                to="/products"
                aria-current={currentPath === "/products" ? "page" : undefined}
              >
                Boutique
              </Link>
            </li>
            <li>
              <Link
                to="/blog"
                aria-current={currentPath === "/blog" ? "page" : undefined}
              >
                Blog
              </Link>
            </li>
            <li>
              <Link
                to="/contact"
                aria-current={currentPath === "/contact" ? "page" : undefined}
              >
                Contact
              </Link>
            </li>
          </ul>
        </nav>

        {/* Actions Section */}
        <div className="header-actions">
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
        <div className="hidden md:flex items-center gap-1 min-w-[200px] justify-end">
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
          className="md:hidden text-stone-700 p-3 rounded-xl hover:bg-stone-100 transition-all duration-200 active:scale-95 touch-manipulation"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label={isMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={isMenuOpen}
          aria-haspopup="true"
          aria-controls="mobile-menu"
        >
          <div className="relative w-6 h-6">
            <span className={`absolute block w-6 h-0.5 bg-current transition-all duration-300 ${isMenuOpen ? 'rotate-45 top-3' : 'top-1'}`}></span>
            <span className={`absolute block w-6 h-0.5 bg-current transition-opacity duration-300 top-3 ${isMenuOpen ? 'opacity-0' : 'opacity-100'}`}></span>
            <span className={`absolute block w-6 h-0.5 bg-current transition-all duration-300 ${isMenuOpen ? '-rotate-45 top-3' : 'top-5'}`}></span>
          </div>
        </button>
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

// Wrap in React.memo to prevent unnecessary re-renders
export default React.memo(Navigation);
