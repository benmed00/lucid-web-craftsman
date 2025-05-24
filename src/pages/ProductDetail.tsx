// file_name : src/pages/ProductDetail.tsx
// this file is used to display the product details
// and related products

import { ArrowRight, ShoppingBag } from "lucide-react"; // Leaf removed, will be in ProductInfo
import { Card, CardContent } from "@/components/ui/card";
import { Link, useParams } from "react-router-dom";
// Tabs related imports will be removed as ProductTabs handles it.
// Badge will be removed as ProductInfo handles it.
import { addToCart, getProductById } from "@/api/mockApiService";
import { useState, useEffect } from "react"; 

import { useQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
// Components to be imported
import ProductImageGallery from '@/components/product/ProductImageGallery';
import ProductInfo from '@/components/product/ProductInfo';
import QuantitySelector from '@/components/product/QuantitySelector';
import ProductTabs from '@/components/product/ProductTabs';
// Badge removed from here
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import PageFooter from "@/components/PageFooter";
import { Product } from "../shared/interfaces/Iproduct.interface";
import { toast } from "sonner";

const ProductDetail = () => {
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>(); 
  const numericId = id ? parseInt(id, 10) : undefined;

  const [quantity, setQuantity] = useState(1);
  // selectedImage state is removed, ProductImageGallery will manage it.

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]); // Scroll to top when id changes

  // Fetch main product
  const { 
    data: product, 
    isLoading: productLoading, 
    isError: productIsError, 
    error: productError 
  } = useQuery<Product | null, Error>({
    queryKey: ['product', numericId],
    queryFn: () => numericId ? getProductById(numericId) : Promise.resolve(null),
    enabled: !!numericId, // Only run if numericId is a valid number
  });

  // Fetch related products
  const relatedProductIds = product?.related || [];
  const relatedProductsResults = useQueries({
    queries: product && product.related ? product.related.map((relatedId: number) => ({
      queryKey: ['product', relatedId],
      queryFn: () => getProductById(relatedId),
      enabled: !!product, // Only run if main product is loaded
    })) : [],
  });

  // Filter out successfully fetched related products
  const relatedProducts = relatedProductsResults
    .filter(query => query.isSuccess && query.data)
    .map(query => query.data as Product);

  const addToCartMutation = useMutation({
    mutationFn: (variables: { product: Product; quantity: number }) => 
      addToCart(variables.product, variables.quantity),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success(`${variables.quantity} × ${variables.product.name} ajouté au panier`);
    },
    onError: (error: Error, variables) => {
      console.error("Error adding product to cart:", error);
      toast.error(`Impossible d'ajouter ${variables.product.name} au panier`);
    },
  });

  const handleAddToCart = () => {
    if (!product || quantity < 1) return;
    addToCartMutation.mutate({ product, quantity });
  };

  // Handle loading state for the main product
  if (productLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="container mx-auto px-4 py-16 flex justify-center items-center">
          <div className="text-center">
            <p>Chargement du produit...</p>
          </div>
        </div>
        <PageFooter />
      </div>
    );
  }

  // Handle error state for the main product or if product is not found after loading
  if (productIsError || !product) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="container mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-serif">Produit non trouvé</h2>
          <p className="mt-4 mb-8 text-stone-600">
            Le produit que vous recherchez n'existe pas.
          </p>
          <Link to="/products">
            <Button className="bg-olive-700 hover:bg-olive-800">
              Retour aux produits
            </Button>
          </Link>
          {productIsError && productError && (
            <p className="mt-4 text-red-500">Erreur: {productError.message}</p>
          )}
        </div>
        <PageFooter />
      </div>
    );
  }

  // At this point, product is loaded and available
  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* Breadcrumbs */}
      <div className="container mx-auto px-4 py-4">
        <div className="text-sm text-stone-500">
          <Link to="/" className="hover:text-olive-700">
            Accueil
          </Link>
          <span className="mx-2">/</span>
          <Link to="/products" className="hover:text-olive-700">
            Boutique
          </Link>
          <span className="mx-2">/</span>
          <span className="text-stone-700">{product.name}</span>
        </div>
      </div>

      {/* Product Section */}
      <section className="container mx-auto px-4 py-8 mb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Product Images - Replaced with ProductImageGallery component */}
          <ProductImageGallery images={product.images} productName={product.name} />

          {/* Product Info - Replaced with ProductInfo, QuantitySelector, Button, ProductTabs */}
          <div>
            <ProductInfo product={product} />
            
            <div className="mb-8"> {/* Kept margin bottom from original Quantity Selector div */}
              <QuantitySelector 
                quantity={quantity}
                onIncrement={() => setQuantity(quantity + 1)}
                onDecrement={() => setQuantity(Math.max(1, quantity - 1))}
              />
            </div>

            <Button
              onClick={handleAddToCart}
              className="w-full mb-4 bg-olive-700 hover:bg-olive-800 text-white font-medium py-6"
              disabled={addToCartMutation.isPending} // Disable button when mutation is in progress
            >
              <ShoppingBag className="mr-2 h-5 w-5" />
              {addToCartMutation.isPending ? 'Ajout en cours...' : 'Ajouter au panier'}
            </Button>

            <ProductTabs product={product} />
          </div>
        </div>
      </section>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="bg-beige-50 py-16">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-end mb-8">
              <h2 className="font-serif text-2xl md:text-3xl text-stone-800">
                Vous pourriez aussi aimer
              </h2>
              <Link
                to="/products"
                className="hidden md:flex items-center text-olive-700 hover:text-olive-900 transition-colors"
              >
                Voir tout <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {relatedProducts.map((product) => (
                <Link
                  to={`/products/${product.id}`}
                  key={product.id}
                  className="group"
                >
                  <Card className="border-none shadow-sm overflow-hidden hover-scale">
                    <div className="aspect-ratio aspect-w-1 aspect-h-1 relative overflow-hidden">
                      <img
                      src={relatedProd.images[0]} // Changed product to relatedProd
                      alt={relatedProd.name}      // Changed product to relatedProd
                        className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <CardContent className="p-4">
                      <div className="text-xs text-stone-500 mb-1">
                      {relatedProd.category} {/* Changed product to relatedProd */}
                      </div>
                      <h3 className="font-medium text-stone-800 mb-1">
                      {relatedProd.name} {/* Changed product to relatedProd */}
                      </h3>
                      <p className="text-olive-700 font-medium">
                      {relatedProd.price} € {/* Changed product to relatedProd */}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <PageFooter />
    </div>
  );
};

export default ProductDetail;
