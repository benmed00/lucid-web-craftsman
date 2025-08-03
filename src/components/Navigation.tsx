
import { Leaf, Menu, ShoppingBag, X, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import CartIcon from "../context/CartIcon";
import { Link, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { useCartUI } from "../context/useCartUI";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { itemCount, cartColor, badgeTextColor } = useCartUI();
  const navigate = useNavigate();
  const { user, signOut, isLoading } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <nav className="bg-white/95 backdrop-blur-sm sticky top-0 z-40 border-b border-stone-100 shadow-sm">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Link to="/" className="group">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-full bg-olive-50 group-hover:bg-olive-100 transition-colors">
                <Leaf className="h-5 w-5 text-olive-600" />
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-xl font-semibold text-stone-800 leading-tight">
                  Rif Raw Straw
                </span>
                <span className="text-xs text-stone-500 leading-tight">
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

      <div className="flex items-center gap-2">
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
                  <Link to="/profile" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="text-sm">{user.user_metadata?.full_name || user.email}</span>
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={handleSignOut} className="flex items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  <span className="text-sm">Déconnexion</span>
                </Button>
              </div>
            ) : (
              <Button variant="default" size="sm" asChild className="hidden md:inline-flex">
                <Link to="/auth">Se connecter</Link>
              </Button>
            )}
          </>
        )}
      </div>

      {/* Mobile Menu Button */}
      <button
        className="md:hidden text-stone-700"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
      >
        {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white/98 backdrop-blur-sm shadow-xl z-50 animate-fade-in border-t border-stone-100">
          <div className="flex flex-col space-y-1 p-4">
            <Link
              to="/"
              className="text-stone-700 hover:text-olive-700 hover:bg-olive-50 transition-all py-3 px-4 rounded-lg font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              🏠 Accueil
            </Link>
            <Link
              to="/products"
              className="text-stone-700 hover:text-olive-700 hover:bg-olive-50 transition-all py-3 px-4 rounded-lg font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              🛍️ Boutique
            </Link>
            <Link
              to="/blog"
              className="text-stone-700 hover:text-olive-700 hover:bg-olive-50 transition-all py-3 px-4 rounded-lg font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              📖 Blog
            </Link>
            <Link
              to="/contact"
              className="text-stone-700 hover:text-olive-700 hover:bg-olive-50 transition-all py-3 px-4 rounded-lg font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              💬 Contact
            </Link>

            <div className="pt-3 mt-3 border-t border-stone-200">
              <Link
                to="/cart"
                className="w-full block"
                onClick={() => setIsMenuOpen(false)}
              >
                <Button
                  className={clsx(
                    "w-full transition-all duration-200 flex items-center justify-center py-3",
                    itemCount >= 1
                      ? "bg-olive-700 text-white hover:bg-olive-800"
                      : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                  )}
                >
                  <ShoppingBag className="mr-2 h-4 w-4" /> 
                  Panier {itemCount > 0 && `(${itemCount})`}
                </Button>
              </Link>
            </div>

            {/* Mobile auth buttons */}
            {!isLoading && (
              <>
                {user ? (
                  <div className="pt-3 mt-3 border-t border-stone-200">
                    <Link to="/profile" onClick={() => setIsMenuOpen(false)}>
                      <div className="mb-3 px-4 py-2 bg-olive-50 rounded-lg hover:bg-olive-100 transition-colors cursor-pointer">
                        <div className="flex items-center gap-2 text-sm text-olive-700">
                          <User className="h-4 w-4" />
                          {user.user_metadata?.full_name || user.email}
                        </div>
                      </div>
                    </Link>
                    <Button 
                      variant="outline" 
                      onClick={handleSignOut} 
                      className="w-full flex items-center justify-center gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      Déconnexion
                    </Button>
                  </div>
                ) : (
                  <div className="pt-3 mt-3 border-t border-stone-200">
                    <Button variant="default" asChild className="w-full">
                      <Link to="/auth" onClick={() => setIsMenuOpen(false)}>Se connecter</Link>
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
    </nav>
  );
};

export default Navigation;
