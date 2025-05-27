
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useCart } from "@/context/useCart";
import { toast } from "sonner";
import { ShoppingCart } from "lucide-react";
import { IProduct } from "@/shared/interfaces/Iproduct.interface";
import { useEffect, useState } from "react";
import { getProducts } from "@/api/mockApiService";

const ProductShowcase = () => {
  const { dispatch } = useCart();
  const [featuredProducts, setFeaturedProducts] = useState<IProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFeaturedProducts: () => Promise<void> = async () => {
      try {
        // Get all products
        const allProducts: IProduct[] = await getProducts();
        // Select first 4 products as featured
        setFeaturedProducts(allProducts.slice(0, 4));
        setLoading(false);
      } catch (error) {
        console.error("Error loading featured products:", error);
        setLoading(false);
      }
    };

    void loadFeaturedProducts();
  }, [getProducts]);

  const handleAddToCart = (product: IProduct) => {
    // Add to cart
    dispatch({
      type: "ADD_ITEM",
      payload: product,
      quantity: 1,
    });
    
    toast.success(`${product.name} ajouté au panier`);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-white border-none overflow-hidden animate-pulse">
            <div className="h-48 bg-gray-200"></div>
            <CardContent className="p-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="flex justify-between items-center">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {featuredProducts.map((product) => (
        <Card key={product.id} className="bg-white border-none overflow-hidden group hover:shadow-md transition-all duration-300">
          <Link to={`/products/${product.id}`}>
            <div className="relative">
              <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-t-lg">
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              {product.new && (
                <Badge className="absolute top-2 right-2 bg-olive-700 text-white border-none">
                  Nouveau
                </Badge>
              )}
            </div>
          </Link>
          <CardContent className="p-4">
            <p className="text-sm text-olive-700 font-medium">
              {product.category}
            </p>
            <Link to={`/products/${product.id}`}>
              <h3 className="font-serif text-lg font-medium text-stone-800 mt-1 mb-2">
                {product.name}
              </h3>
            </Link>
            <div className="flex justify-between items-center mt-2">
              <p className="text-stone-700 font-medium">{product.price} €</p>
              <Button 
                size="sm" 
                onClick={() => handleAddToCart(product)}
                className="bg-olive-700 hover:bg-olive-800"
              >
                <ShoppingCart className="mr-1 h-4 w-4" />
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
