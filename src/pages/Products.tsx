
// Card, CardContent, Link, ShoppingBag, specific Badge from ui/badge will be indirectly used via sub-components
// useState is still needed for activeFilter and new currentSort
import { useState } from "react"; 
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"; 
import { Badge } from "@/components/ui/badge"; // This Badge is for the Hero Banner, keep it.
import { Button } from "@/components/ui/button"; // For the error retry button
import Navigation from "@/components/Navigation";
import PageFooter from "@/components/PageFooter";
import { Product } from "@/shared/interfaces/Iproduct.interface";
import { addToCart, getProducts } from "@/api/mockApiService";
import { toast } from "sonner";

// Import new sub-components
import ProductFilterBar from '@/components/filters/ProductFilterBar';
import ProductGrid from '@/components/product/ProductGrid';

const Products = () => {
  const [activeFilter, setActiveFilter] = useState("all");
  const [currentSort, setCurrentSort] = useState("popular"); // Added for ProductFilterBar
  const queryClient = useQueryClient();

  // Fetch products using React Query
  const { 
    data: products = [], // Default to empty array
    isLoading, 
    isError, 
    error: queryError 
  } = useQuery<Product[], Error>({
    queryKey: ['products'],
    queryFn: getProducts,
  });

  // Scroll to top on mount - can be kept if desired, or handled by router configurations
  useState(() => { 
    window.scrollTo(0, 0);
    // Return undefined or null to satisfy React's rule for useState initializer if it's used like this
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
  
  // TODO: Implement actual sorting based on currentSort
  const sortedProducts = [...products].sort((a, b) => {
    if (currentSort === 'price-asc') {
      return a.price - b.price;
    } else if (currentSort === 'price-desc') {
      return b.price - a.price;
    }
    // Add more sort conditions as needed, e.g., for 'popular' or 'newest'
    // For 'popular' or 'newest', you might need additional data or just use default order
    return 0; // Default: no change in order
  });

  const filteredProducts = activeFilter === "all" 
    ? sortedProducts 
    : sortedProducts.filter(p => p.category.toLowerCase() === activeFilter.toLowerCase());

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
        onFilterChange={setActiveFilter}
        currentSort={currentSort}
        onSortChange={setCurrentSort}
      />

      {/* Products Grid - Replaced with ProductGrid component */}
      <div className="container mx-auto px-4 mb-16">
        <ProductGrid products={filteredProducts} onAddToCart={handleAddToCart} />
      </div>

      <PageFooter />
    </div>
  );
};

export default Products;
