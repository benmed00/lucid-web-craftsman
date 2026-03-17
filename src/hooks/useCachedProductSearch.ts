import { useMemo } from 'react';
import { Product } from '@/shared/interfaces/Iproduct.interface';
import { AdvancedFilterOptions } from './useAdvancedProductFilters';

// Search and score products
const searchAndScoreProducts = (
  products: Product[],
  searchQuery: string
): Product[] => {
  if (!searchQuery.trim()) return products;

  const searchTerms = searchQuery.toLowerCase().split(' ').filter(Boolean);

  return products
    .map((product) => {
      let score = 0;
      const searchableText = [
        product.name,
        product.description,
        product.details,
        product.category,
        product.artisan,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (searchableText.includes(searchQuery.toLowerCase())) {
        score += 100;
      }

      searchTerms.forEach((term) => {
        if (searchableText.includes(term)) {
          score += 10;
        }
        const words = searchableText.split(' ');
        words.forEach((word) => {
          if (word.includes(term) || term.includes(word)) {
            score += 5;
          }
        });
      });

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

  if (filters.category.length > 0) {
    filtered = filtered.filter((p) => filters.category.includes(p.category));
  }

  filtered = filtered.filter(
    (p) => p.price >= filters.priceRange[0] && p.price <= filters.priceRange[1]
  );

  if (filters.isNew) {
    filtered = filtered.filter((p) => p.new || p.is_new);
  }

  if (filters.artisan.length > 0) {
    filtered = filtered.filter(
      (p) => p.artisan && filters.artisan.includes(p.artisan)
    );
  }

  return filtered.sort((a, b) => {
    switch (filters.sortBy) {
      case 'price-asc':
        return a.price - b.price;
      case 'price-desc':
        return b.price - a.price;
      case 'newest':
        return (
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
        );
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

/**
 * Simplified product search using useMemo instead of useQuery.
 * Client-side filtering/sorting is synchronous — no need for async query layer.
 */
export const useCachedProductSearch = ({
  products,
  filters,
}: UseCachedProductSearchOptions) => {
  const filteredProducts = useMemo(() => {
    if (products.length === 0) return [];
    const searchedProducts = searchAndScoreProducts(
      products,
      filters.searchQuery
    );
    return applyFiltersAndSort(searchedProducts, filters);
  }, [products, filters]);

  return {
    filteredProducts,
    isLoading: false,
    isFetching: false,
    isStale: false,
    prefetchRelatedSearch: (_query: string) => {},
    invalidateCache: () => {},
    getCacheStats: () => ({ cachedQueries: 0, totalCacheSize: 0 }),
  };
};
