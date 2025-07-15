
// useState will be removed for activeFilter and currentSort as the hook handles them.
// It's only kept for the scroll-to-top effect.
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button"; // For the error retry button
import Navigation from "@/components/Navigation";
import PageFooter from "@/components/PageFooter";
import { Product } from "@/shared/interfaces/Iproduct.interface";
import { addToCart, getProducts } from "@/api/mockApiService";
import { toast } from "sonner";

// Import sub-components and the new hook
import ProductFilterBar from '@/components/filters/ProductFilterBar';
import ProductGrid from '@/components/product/ProductGrid';
import { useProductFilters } from '@/hooks/useProductFilters'; // Import the new hook

const Products = () => {
  // const [activeFilter, setActiveFilter] = useState("all"); // Managed by hook
  // const [currentSort, setCurrentSort] = useState("popular"); // Managed by hook
  const queryClient = useQueryClient();

  // Fetch products using React Query
  const {
    data: productsData = [], // Renamed to avoid conflict with hook's products
    isLoading,
    isError,
    error: queryError
  } = useQuery<Product[], Error>({
    queryKey: ['products'],
    queryFn: getProducts,
  });

  // Use the custom hook for filtering and sorting
  const {
    filteredAndSortedProducts,
    activeFilter,
    setActiveFilter,
    currentSort,
    setCurrentSort,
  } = useProductFilters(productsData); // Pass fetched products to the hook

  // Scroll to top on mount
  useState(() => {
    window.scrollTo(0, 0);
    return undefined;
  });

  const addToCartMutation = useMutation({
    mutationFn: (variables: { product: Product; quantity: number }) =>
      addToCart(variables.product, variables.quantity),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success(`${variables.product.name} ajouté au panier`);
    },
    onError: (error: Error, variables) => {
      console.error("Error adding product to cart:", error);
      toast.error(`Impossible d'ajouter ${variables.product.name} au panier`);
    },
  });

  const handleAddToCart = (product: Product, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    addToCartMutation.mutate({ product, quantity: 1 });
  };

  // Filtering and sorting logic is now in useProductFilters hook
  // const sortedProducts = ...;
  // const filteredProducts = ...;

  if (isLoading) {
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

  if (isError) { // Changed from error
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="container mx-auto px-4 py-16 flex justify-center items-center">
          <div className="text-center">
            {/* Display error message from React Query */}
            <p className="text-red-500">
              {queryError?.message || "Impossible de charger les produits. Veuillez réessayer plus tard."}
            </p>
            <Button 
              onClick={() => window.location.reload()} // Or use queryClient.refetch if available
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

      {/* Filters - Replaced with ProductFilterBar component */}
      <ProductFilterBar
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter} // Pass setter from hook
        currentSort={currentSort}
        onSortChange={setCurrentSort}   // Pass setter from hook
      />

      {/* Products Grid - Use products from the hook */}
      <div className="container mx-auto px-4 mb-16">
        <ProductGrid products={filteredAndSortedProducts} onAddToCart={handleAddToCart} />
      </div>

      <PageFooter />
    </div>
  );
};

export default Products;
