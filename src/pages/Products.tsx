
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import PageFooter from "@/components/PageFooter";
import { Product } from "@/shared/interfaces/Iproduct.interface";
import { ShoppingBag } from "lucide-react";
import { addToCart } from "@/api/mockApiService";
import { getProducts } from "@/api/mockApiService";
import { toast } from "sonner";
import { useCart } from "@/context/useCart";

const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const { dispatch } = useCart();

  useEffect(() => {
    window.scrollTo(0, 0);
    
    const fetchProducts = async () => {
      try {
        const data = await getProducts();
        setProducts(data);
        setLoading(false);
        setError(null);
      } catch (error) {
        console.error("Error fetching products:", error);
        setLoading(false);
        setError("Impossible de charger les produits. Veuillez réessayer plus tard.");
      }
    };
    
    fetchProducts();
  }, []);

  const handleAddToCart = async (product: Product, event: React.MouseEvent) => {
    event.preventDefault(); // Prevent navigation to product detail
    event.stopPropagation(); // Stop event propagation
    
    try {
      // Add to cart via API (which updates localStorage)
      await addToCart(product, 1);
      
      // Update global cart state
      dispatch({ 
        type: "ADD_ITEM", 
        payload: product, 
        quantity: 1 
      });
      
      // Show success message
      toast.success(`${product.name} ajouté au panier`);
    } catch (error) {
      console.error("Error adding product to cart:", error);
      toast.error("Impossible d'ajouter le produit au panier");
    }
  };

  const filteredProducts = activeFilter === "all" 
    ? products 
    : products.filter(p => p.category.toLowerCase() === activeFilter.toLowerCase());

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="container mx-auto px-4 py-16 flex justify-center items-center">
          <div className="text-center">
            <p>Chargement des produits...</p>
          </div>
        </div>
        <PageFooter />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="container mx-auto px-4 py-16 flex justify-center items-center">
          <div className="text-center">
            <p className="text-red-500">{error}</p>
            <Button 
              onClick={() => window.location.reload()} 
              className="mt-4 bg-olive-700 hover:bg-olive-800"
            >
              Réessayer
            </Button>
          </div>
        </div>
        <PageFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* Hero Banner */}
      <div className="bg-beige-50 py-12 mb-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="mb-2 bg-olive-100 text-olive-800 hover:bg-olive-200 border-none">
              Collection Artisanale
            </Badge>
            <h1 className="font-serif text-4xl md:text-5xl text-stone-800 mb-4">
              Notre Boutique
            </h1>
            <p className="text-stone-600 md:text-lg">
              Découvrez notre sélection de sacs et chapeaux faits main dans les
              montagnes du Rif au Maroc, perpétuant des traditions ancestrales.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="container mx-auto px-4 mb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className={`cursor-pointer ${
                activeFilter === "all"
                  ? "border-olive-300 bg-olive-50 text-olive-800"
                  : "border-stone-300 hover:border-olive-300 hover:bg-olive-50 hover:text-olive-800"
              }`}
              onClick={() => setActiveFilter("all")}
            >
              Tous les produits
            </Badge>
            <Badge
              variant="outline"
              className={`cursor-pointer ${
                activeFilter === "sacs"
                  ? "border-olive-300 bg-olive-50 text-olive-800"
                  : "border-stone-300 hover:border-olive-300 hover:bg-olive-50 hover:text-olive-800"
              }`}
              onClick={() => setActiveFilter("sacs")}
            >
              Sacs
            </Badge>
            <Badge
              variant="outline"
              className={`cursor-pointer ${
                activeFilter === "chapeaux"
                  ? "border-olive-300 bg-olive-50 text-olive-800"
                  : "border-stone-300 hover:border-olive-300 hover:bg-olive-50 hover:text-olive-800"
              }`}
              onClick={() => setActiveFilter("chapeaux")}
            >
              Chapeaux
            </Badge>
          </div>

          <div className="flex gap-2">
            <select className="text-sm border border-stone-300 rounded-md py-2 px-3 focus:outline-none focus:border-olive-400">
              <option>Trier par: Populaire</option>
              <option>Prix: Croissant</option>
              <option>Prix: Décroissant</option>
              <option>Nouveautés</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="container mx-auto px-4 mb-16">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-lg text-stone-600">Aucun produit trouvé dans cette catégorie</p>
            <p className="text-sm text-stone-500 mt-2">Essayez de sélectionner "Tous les produits"</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
            {filteredProducts.map((product) => (
              <div key={product.id} className="group relative">
                <Card className="bg-white border-none overflow-hidden group hover:shadow-xl transition-all duration-500 transform hover:-translate-y-1">
                  <Link to={`/products/${product.id}`}>
                    <div className="relative overflow-hidden rounded-t-lg">
                      <div className="aspect-square w-full">
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700"
                          loading="lazy"
                        />
                      </div>
                      {product.new && (
                        <Badge className="absolute top-3 right-3 bg-olive-700 text-white border-none shadow-md px-3 py-1">
                          Nouveau
                        </Badge>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
                    </div>
                  </Link>
                  
                  <CardContent className="p-5">
                    <div className="mb-2">
                      <Badge variant="outline" className="text-xs text-olive-700 border-olive-200 mb-2">
                        {product.category}
                      </Badge>
                    </div>
                    <Link to={`/products/${product.id}`}>
                      <h3 className="font-serif text-lg font-medium text-stone-800 mb-3 hover:text-olive-700 transition-colors line-clamp-2 leading-tight">
                        {product.name}
                      </h3>
                    </Link>
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col">
                        <p className="text-stone-700 font-semibold text-lg">{product.price} €</p>
                        <p className="text-xs text-stone-500">Livraison gratuite</p>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={(e) => handleAddToCart(product, e)}
                        className="bg-olive-700 hover:bg-olive-800 shadow-md hover:shadow-lg transition-all duration-200 px-4 py-2"
                      >
                        <ShoppingBag className="mr-2 h-4 w-4" />
                        <span className="hidden sm:inline">Ajouter</span>
                        <span className="sm:hidden">+</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>

      <PageFooter />
    </div>
  );
};

export default Products;
