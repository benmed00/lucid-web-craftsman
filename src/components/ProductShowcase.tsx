
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useCart } from "@/context/useCart";
import { toast } from "sonner";
import { ShoppingCart, Heart } from "lucide-react";
import { Product } from "@/shared/interfaces/Iproduct.interface";
import { useEffect, useState } from "react";
import { getProducts } from "@/api/mockApiService";
import { Image } from "@/components/ui/image";
import { ImageUtils } from "@/utils/imageUtils";

const ProductShowcase = () => {
  const { dispatch } = useCart();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFeaturedProducts = async () => {
      try {
        const allProducts = await getProducts();
        const featured = allProducts.slice(0, 4);
        setFeaturedProducts(featured);
        
        // Preload featured product images for better performance
        const imagesToPreload = featured.flatMap(product => product.images);
        ImageUtils.preloadImages(imagesToPreload);
        
        setLoading(false);
      } catch (error) {
        console.error("Error loading featured products:", error);
        setLoading(false);
      }
    };

    loadFeaturedProducts();
  }, []);

  const handleAddToCart = (product: Product) => {
    dispatch({
      type: "ADD_ITEM",
      payload: product,
      quantity: 1,
    });
    
    toast.success(`${product.name} ajouté au panier`);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-white border-none overflow-hidden animate-pulse shadow-sm">
            <div className="h-64 bg-beige-200 rounded-t-lg"></div>
            <CardContent className="p-6">
              <div className="h-4 bg-beige-200 rounded w-3/4 mb-3"></div>
              <div className="h-6 bg-beige-200 rounded w-1/2 mb-4"></div>
              <div className="flex justify-between items-center">
                <div className="h-4 bg-beige-200 rounded w-1/4"></div>
                <div className="h-9 bg-beige-200 rounded w-1/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
      {featuredProducts.map((product) => (
        <Card key={product.id} className="bg-white border-none overflow-hidden group hover:shadow-xl transition-all duration-500 transform hover:-translate-y-1">
          <Link to={`/products/${product.id}`}>
            <div className="relative overflow-hidden rounded-t-lg">
              <div className="aspect-w-1 aspect-h-1 w-full">
                <Image
                  src={ImageUtils.getImageUrl(product.images[0])}
                  alt={product.name}
                  className="object-cover w-full h-64 group-hover:scale-110 transition-transform duration-700"
                  fallbackText="Produit artisanal"
                />
              </div>
              {product.new && (
                <Badge className="absolute top-3 right-3 bg-olive-700 text-white border-none shadow-md px-3 py-1">
                  Nouveau
                </Badge>
              )}
              <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button className="bg-white/90 p-2 rounded-full shadow-md hover:bg-white transition-colors">
                  <Heart className="h-4 w-4 text-stone-600 hover:text-olive-700" />
                </button>
              </div>
            </div>
          </Link>
          <CardContent className="p-6">
            <div className="mb-3">
              <Badge variant="outline" className="text-xs text-olive-700 border-olive-200 mb-2">
                {product.category}
              </Badge>
            </div>
            <Link to={`/products/${product.id}`}>
              <h3 className="font-serif text-lg font-medium text-stone-800 mb-3 hover:text-olive-700 transition-colors line-clamp-2">
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
                onClick={() => handleAddToCart(product)}
                className="bg-olive-700 hover:bg-olive-800 shadow-md hover:shadow-lg transition-all duration-200 px-4 py-2"
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                Ajouter
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ProductShowcase;
