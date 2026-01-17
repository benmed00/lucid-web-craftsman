import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Product } from '@/shared/interfaces/Iproduct.interface';
import { AdvancedFilterOptions } from './useAdvancedProductFilters';

// Generate a stable cache key from filters
const generateCacheKey = (filters: AdvancedFilterOptions, productsHash: string): string[] => {
  return [
    'product-search',
    productsHash,
    filters.searchQuery,
    filters.category.sort().join(','),
    `${filters.priceRange[0]}-${filters.priceRange[1]}`,
    filters.sortBy,
    String(filters.isNew),
    String(filters.inStock),
    filters.artisan.sort().join(','),
    String(filters.rating)
  ];
};

// Search and score products
const searchAndScoreProducts = (
  products: Product[],
  searchQuery: string
): Product[] => {
  if (!searchQuery.trim()) return products;

  const searchTerms = searchQuery.toLowerCase().split(' ').filter(Boolean);

  return products
    .map(product => {
      let score = 0;
      const searchableText = [
        product.name,
        product.description,
        product.details,
        product.category,
        product.artisan
      ].filter(Boolean).join(' ').toLowerCase();

      // Exact phrase match (highest score)
      if (searchableText.includes(searchQuery.toLowerCase())) {
        score += 100;
      }

      // Individual term matches
      searchTerms.forEach(term => {
        if (searchableText.includes(term)) {
          score += 10;
        }
        // Partial matches for typo tolerance
        const words = searchableText.split(' ');
        words.forEach(word => {
          if (word.includes(term) || term.includes(word)) {
            score += 5;
          }
        });
      });

      // Boost for title matches
      if (product.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        score += 50;
      }

      return { product, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ product }) => product);
};

// Apply filters and sorting
const applyFiltersAndSort = (
  products: Product[],
  filters: AdvancedFilterOptions
): Product[] => {
  let filtered = [...products];

  // Category filter
  if (filters.category.length > 0) {
    filtered = filtered.filter(p => filters.category.includes(p.category));
  }

  // Price range filter
  filtered = filtered.filter(
    p => p.price >= filters.priceRange[0] && p.price <= filters.priceRange[1]
  );

  // New products filter
  if (filters.isNew) {
    filtered = filtered.filter(p => p.new || p.is_new);
  }

  // Artisan filter
  if (filters.artisan.length > 0) {
    filtered = filtered.filter(p => p.artisan && filters.artisan.includes(p.artisan));
  }

  // Apply sorting
  return filtered.sort((a, b) => {
    switch (filters.sortBy) {
      case 'price-asc':
        return a.price - b.price;
      case 'price-desc':
        return b.price - a.price;
      case 'newest':
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      case 'popularity':
        return b.name.length - a.name.length;
      case 'rating':
        return a.name.localeCompare(b.name);
      case 'name':
      default:
        return a.name.localeCompare(b.name);
    }
  });
};

interface UseCachedProductSearchOptions {
  products: Product[];
  filters: AdvancedFilterOptions;
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
}

export const useCachedProductSearch = ({
  products,
  filters,
  enabled = true,
  staleTime = 5 * 60 * 1000, // 5 minutes
  cacheTime = 10 * 60 * 1000 // 10 minutes
}: UseCachedProductSearchOptions) => {
  const queryClient = useQueryClient();

  // Create a stable hash of products for cache key
  const productsHash = useMemo(() => {
    return `${products.length}-${products[0]?.id || 'empty'}`;
  }, [products]);

  const cacheKey = generateCacheKey(filters, productsHash);

  const {
    data: filteredProducts = [],
    isLoading,
    isFetching,
    isStale
  } = useQuery({
    queryKey: cacheKey,
    queryFn: () => {
      // Search products
      const searchedProducts = searchAndScoreProducts(products, filters.searchQuery);
      // Apply filters and sort
      return applyFiltersAndSort(searchedProducts, filters);
    },
    enabled: enabled && products.length > 0,
    staleTime,
    gcTime: cacheTime,
    // Keep previous data while fetching new results
    placeholderData: (previousData) => previousData,
  });

  // Prefetch related searches
  const prefetchRelatedSearch = (query: string) => {
    const prefetchFilters = { ...filters, searchQuery: query };
    const prefetchKey = generateCacheKey(prefetchFilters, productsHash);
    
    queryClient.prefetchQuery({
      queryKey: prefetchKey,
      queryFn: () => {
        const searchedProducts = searchAndScoreProducts(products, query);
        return applyFiltersAndSort(searchedProducts, prefetchFilters);
      },
      staleTime
    });
  };

  // Clear all product search cache completely
  const invalidateCache = () => {
    // Remove all product-search queries from cache (not just invalidate)
    queryClient.removeQueries({ queryKey: ['product-search'] });
  };

  // Get cache stats
  const getCacheStats = () => {
    const cache = queryClient.getQueryCache();
    const productSearchQueries = cache.findAll({ queryKey: ['product-search'] });
    
    return {
      cachedQueries: productSearchQueries.length,
      totalCacheSize: productSearchQueries.reduce((acc, q) => {
        const data = q.state.data as Product[] | undefined;
        return acc + (data?.length || 0);
      }, 0)
    };
  };

  return {
    filteredProducts,
    isLoading,
    isFetching,
    isStale,
    prefetchRelatedSearch,
    invalidateCache,
    getCacheStats
  };
};
