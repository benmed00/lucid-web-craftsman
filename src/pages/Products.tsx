
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
            <p className="text-lg text-stone-600">Aucun produit trouvé</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {filteredProducts.map((product) => (
              <Link
                to={`/products/${product.id}`}
                key={product.id}
                className="group relative"
              >
                <Card className="border-none shadow-sm overflow-hidden hover-scale">
                  <div className="aspect-ratio aspect-w-1 aspect-h-1 relative overflow-hidden">
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                    />
                    {product.new && (
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-olive-500 text-white border-none">
                          Nouveau
                        </Badge>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="text-xs text-stone-500 mb-1">
                      {product.category}
                    </div>
                    <h3 className="font-medium text-stone-800 mb-1">
                      {product.name}
                    </h3>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-olive-700 font-medium">
                        {product.price} €
                      </p>
                      <Button 
                        size="sm" 
                        className="bg-olive-700 hover:bg-olive-800"
                        onClick={(e) => handleAddToCart(product, e)}
                      >
                        <ShoppingBag className="h-4 w-4 mr-1" />
                        Ajouter
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <PageFooter />
    </div>
  );
};

export default Products;
