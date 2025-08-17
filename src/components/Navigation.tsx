
import { Leaf, Menu, ShoppingBag, X, User, LogOut, Heart, ShoppingCart, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
// import CartIcon from "../context/CartIcon"; // Marked as unused
import { Link } from "react-router-dom";

import clsx from "clsx";
import { useCartUI } from "../context/useCartUI";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWishlist } from "@/hooks/useWishlist";
import CurrencySelector from "@/components/CurrencySelector";

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { itemCount, cartColor } = useCartUI(); // Removed _badgeTextColor
  const { user, isLoading, signOut } = useAuth();
  const { wishlistCount } = useWishlist();

  const handleSignOut = async () => {
    try {
      await signOut();
      setIsMenuOpen(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };


  return (
    <nav className="bg-white/95 backdrop-blur-sm sticky top-0 z-40 border-b border-stone-100 shadow-sm">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
      <div className="flex items-center space-x-2">
          <Link to="/" className="group">
            <div className="flex items-center space-x-2 md:space-x-3">
              <div className="p-1.5 md:p-2 rounded-full bg-olive-50 group-hover:bg-olive-100 transition-colors">
                <Leaf className="h-4 w-4 md:h-5 md:w-5 text-olive-600" />
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-lg md:text-xl font-semibold text-stone-800 leading-tight">
                  Rif Raw Straw
                </span>
                <span className="text-xs text-stone-500 leading-tight hidden sm:block">
                  Artisanat Berbère
                </span>
              </div>
            </div>
          </Link>
        </div>

      {/* Desktop Navigation */}
      <div className="hidden md:flex space-x-6">
        <Link
          to="/"
          className="text-stone-700 hover:text-stone-900 transition-colors"
        >
          Accueil
        </Link>
        <Link
          to="/products"
          className="text-stone-700 hover:text-stone-900 transition-colors"
        >
          Boutique
        </Link>
        <Link
          to="/blog"
          className="text-stone-700 hover:text-stone-900 transition-colors"
        >
          Blog
        </Link>
        <Link
          to="/contact"
          className="text-stone-700 hover:text-stone-900 transition-colors"
        >
          Contact
        </Link>
      </div>

      <div className="flex items-center gap-3">
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
              "border-stone-300 transition-colors flex items-center group",
              itemCount >= 1
                ? "bg-olive-700 text-white"
                : "bg-white text-stone-700",
              itemCount >= 1
                ? "hover:bg-white hover:text-olive-700"
                : "hover:bg-white hover:text-stone-900"
            )}
          >
            <ShoppingBag
              className={clsx(
                "mr-2 h-4 w-4 transition-colors",
                itemCount >= 1
                  ? "text-white group-hover:text-olive-700"
                  : "text-stone-700 group-hover:text-stone-900"
              )}
            />
            Panier ({itemCount})
          </Button>
        </Link>

        {/* Auth buttons - Desktop */}
        {!isLoading && (
          <>
             {user ? (
               <div className="hidden md:flex items-center gap-2">
                 <Button variant="ghost" size="sm" asChild>
                   <Link to="/orders" className="flex items-center gap-2">
                     <Package className="h-4 w-4" />
                     <span className="text-sm">Mes Commandes</span>
                   </Link>
                 </Button>
                 <Button variant="ghost" size="sm" asChild>
                   <Link to="/profile" className="flex items-center gap-2">
                     <User className="h-4 w-4" />
                     <span className="text-sm">Mon Profil</span>
                   </Link>
                 </Button>
                 <Button variant="ghost" size="sm" onClick={handleSignOut} className="flex items-center gap-2">
                   <LogOut className="h-4 w-4" />
                   <span className="text-sm">Déconnexion</span>
                 </Button>
               </div>
            ) : (
              <Button variant="ghost" size="sm" asChild className="hidden md:inline-flex">
                <Link to="/auth" aria-label="Se connecter">Se connecter</Link>
              </Button>
            )}
          </>
        )}
      </div>

      {/* Mobile Menu Button */}
      <button
        className="md:hidden text-stone-700 p-3 rounded-xl hover:bg-stone-100 transition-all duration-200 active:scale-95 touch-manipulation"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        aria-label={isMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
      >
        <div className="relative w-6 h-6">
          <span className={`absolute block w-6 h-0.5 bg-current transition-all duration-300 ${isMenuOpen ? 'rotate-45 top-3' : 'top-1'}`}></span>
          <span className={`absolute block w-6 h-0.5 bg-current transition-opacity duration-300 top-3 ${isMenuOpen ? 'opacity-0' : 'opacity-100'}`}></span>
          <span className={`absolute block w-6 h-0.5 bg-current transition-all duration-300 ${isMenuOpen ? '-rotate-45 top-3' : 'top-5'}`}></span>
        </div>
      </button>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40 animate-fade-in"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Mobile Menu */}
      <div className={`md:hidden absolute top-full left-0 right-0 bg-white/98 backdrop-blur-sm shadow-xl z-50 border-t border-stone-100 transition-all duration-300 max-h-[90vh] overflow-y-auto ${isMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'}`}>
          <div className="flex flex-col space-y-3 p-6 pb-8">
            <Link
              to="/"
              className="text-stone-700 hover:text-olive-700 hover:bg-olive-50 active:bg-olive-100 transition-all duration-200 py-5 px-5 rounded-xl font-medium flex items-center gap-4 group touch-manipulation min-h-[56px]"
              onClick={() => setIsMenuOpen(false)}
            >
              <span className="text-2xl">🏠</span>
              <span className="group-hover:translate-x-1 transition-transform duration-200 text-lg">Accueil</span>
            </Link>
            <Link
              to="/products"
              className="text-stone-700 hover:text-olive-700 hover:bg-olive-50 active:bg-olive-100 transition-all duration-200 py-5 px-5 rounded-xl font-medium flex items-center gap-4 group touch-manipulation min-h-[56px]"
              onClick={() => setIsMenuOpen(false)}
            >
              <span className="text-2xl">🛍️</span>
              <span className="group-hover:translate-x-1 transition-transform duration-200 text-lg">Boutique</span>
            </Link>
            <Link
              to="/blog"
              className="text-stone-700 hover:text-olive-700 hover:bg-olive-50 active:bg-olive-100 transition-all duration-200 py-5 px-5 rounded-xl font-medium flex items-center gap-4 group touch-manipulation min-h-[56px]"
              onClick={() => setIsMenuOpen(false)}
            >
              <span className="text-2xl">📖</span>
              <span className="group-hover:translate-x-1 transition-transform duration-200 text-lg">Blog</span>
            </Link>
            <Link
              to="/contact"
              className="text-stone-700 hover:text-olive-700 hover:bg-olive-50 active:bg-olive-100 transition-all duration-200 py-5 px-5 rounded-xl font-medium flex items-center gap-4 group touch-manipulation min-h-[56px]"
              onClick={() => setIsMenuOpen(false)}
            >
              <span className="text-2xl">💬</span>
              <span className="group-hover:translate-x-1 transition-transform duration-200 text-lg">Contact</span>
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
      </div>
    </nav>
  );
};

export default Navigation;
