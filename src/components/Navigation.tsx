
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Menu, X, Leaf } from "lucide-react";

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="container mx-auto px-4 py-6 flex justify-between items-center">
      <div className="flex items-center space-x-2">
        <Link to="/">
          <div className="flex items-center space-x-2">
            <Leaf className="h-6 w-6 text-olive-600" />
            <span className="font-serif text-2xl font-medium text-stone-800">Artisan</span>
          </div>
        </Link>
      </div>
      
      {/* Desktop Navigation */}
      <div className="hidden md:flex space-x-6">
        <Link to="/" className="text-stone-700 hover:text-stone-900 transition-colors">Accueil</Link>
        <Link to="/products" className="text-stone-700 hover:text-stone-900 transition-colors">Boutique</Link>
        <Link to="/blog" className="text-stone-700 hover:text-stone-900 transition-colors">Blog</Link>
        <Link to="/contact" className="text-stone-700 hover:text-stone-900 transition-colors">Contact</Link>
      </div>
      
      <Link to="/cart" className="hidden md:flex">
        <Button variant="outline" className="border-stone-300 text-stone-700 hover:bg-stone-50">
          <ShoppingBag className="mr-2 h-4 w-4" /> Panier (0)
        </Button>
      </Link>
      
      {/* Mobile Menu Button */}
      <button 
        className="md:hidden text-stone-700"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
      >
        {isMenuOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className="h-6 w-6" />
        )}
      </button>
      
      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-20 left-0 right-0 bg-white shadow-lg z-50 animate-fade-in">
          <div className="flex flex-col space-y-4 p-6">
            <Link 
              to="/" 
              className="text-stone-700 hover:text-stone-900 transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Accueil
            </Link>
            <Link 
              to="/products" 
              className="text-stone-700 hover:text-stone-900 transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Boutique
            </Link>
            <Link 
              to="/blog" 
              className="text-stone-700 hover:text-stone-900 transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Blog
            </Link>
            <Link 
              to="/contact" 
              className="text-stone-700 hover:text-stone-900 transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Contact
            </Link>
            <Link 
              to="/cart" 
              className="w-full"
              onClick={() => setIsMenuOpen(false)}
            >
              <Button variant="outline" className="w-full border-stone-300 text-stone-700">
                <ShoppingBag className="mr-2 h-4 w-4" /> Panier (0)
              </Button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;
