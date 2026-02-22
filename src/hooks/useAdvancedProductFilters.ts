import { useState, useMemo, useCallback, useDeferredValue } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Product } from '@/shared/interfaces/Iproduct.interface';
import { supabase } from '@/integrations/supabase/client';
import { useCachedProductSearch } from './useCachedProductSearch';

export interface AdvancedFilterOptions {
  searchQuery: string;
  category: string[];
  priceRange: [number, number];
  sortBy:
    | 'name'
    | 'price-asc'
    | 'price-desc'
    | 'newest'
    | 'popularity'
    | 'rating';
  isNew: boolean;
  inStock: boolean;
  artisan: string[];
  material: string[];
  color: string[];
  rating: number;
}

interface UseAdvancedProductFiltersOptions {
  products: Product[];
  enableAnalytics?: boolean;
  debounceMs?: number;
}

interface FilterAnalytics {
  searchQuery: string;
  filters: Partial<AdvancedFilterOptions>;
  resultCount: number;
  timestamp: number;
  userId?: string;
}

export const useAdvancedProductFilters = ({
  products,
  enableAnalytics = true,
  debounceMs = 300,
}: UseAdvancedProductFiltersOptions) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [popularFilters, setPopularFilters] = useState<string[]>([]);

  // Initialize filters from URL parameters
  const getInitialFilters = (): AdvancedFilterOptions => ({
    searchQuery: searchParams.get('q') || '',
    category: searchParams.get('category')?.split(',').filter(Boolean) || [],
    priceRange: [
      parseInt(searchParams.get('minPrice') || '0'),
      parseInt(searchParams.get('maxPrice') || '1000'),
    ] as [number, number],
    sortBy:
      (searchParams.get('sort') as AdvancedFilterOptions['sortBy']) || 'name',
    isNew: searchParams.get('new') === 'true',
    inStock: searchParams.get('inStock') !== 'false',
    artisan: searchParams.get('artisan')?.split(',').filter(Boolean) || [],
    material: searchParams.get('material')?.split(',').filter(Boolean) || [],
    color: searchParams.get('color')?.split(',').filter(Boolean) || [],
    rating: parseInt(searchParams.get('rating') || '0'),
  });

  const [filters, setFilters] =
    useState<AdvancedFilterOptions>(getInitialFilters);

  // Use deferred value for search query to avoid blocking UI during typing
  const deferredSearchQuery = useDeferredValue(filters.searchQuery);

  // Create deferred filters for cached search
  const deferredFilters = useMemo(
    () => ({
      ...filters,
      searchQuery: deferredSearchQuery,
    }),
    [filters, deferredSearchQuery]
  );

  // Use cached product search with React Query
  const {
    filteredProducts,
    isLoading: isCacheLoading,
    isFetching,
    isStale,
    prefetchRelatedSearch,
    getCacheStats,
    invalidateCache,
  } = useCachedProductSearch({
    products,
    filters: deferredFilters,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    cacheTime: 10 * 60 * 1000, // 10 minutes before garbage collection
  });

  // Extract available filter options from products
  const availableOptions = useMemo(() => {
    const categories = [...new Set(products.map((p) => p.category))];
    const artisans = [
      ...new Set(products.map((p) => p.artisan).filter(Boolean)),
    ];
    const materials: string[] = [];
    const colors: string[] = [];

    const priceRange =
      products.length > 0
        ? {
            min: Math.min(...products.map((p) => p.price)),
            max: Math.max(...products.map((p) => p.price)),
          }
        : { min: 0, max: 1000 };

    return {
      categories,
      artisans,
      materials,
      colors,
      priceRange,
    };
  }, [products]);

  // Update URL parameters
  const updateUrlParams = useCallback(
    (newFilters: AdvancedFilterOptions) => {
      const params = new URLSearchParams();

      if (newFilters.searchQuery) params.set('q', newFilters.searchQuery);
      if (newFilters.category.length > 0)
        params.set('category', newFilters.category.join(','));
      if (newFilters.priceRange[0] > availableOptions.priceRange.min) {
        params.set('minPrice', newFilters.priceRange[0].toString());
      }
      if (newFilters.priceRange[1] < availableOptions.priceRange.max) {
        params.set('maxPrice', newFilters.priceRange[1].toString());
      }
      if (newFilters.sortBy !== 'name') params.set('sort', newFilters.sortBy);
      if (newFilters.isNew) params.set('new', 'true');
      if (!newFilters.inStock) params.set('inStock', 'false');
      if (newFilters.artisan.length > 0)
        params.set('artisan', newFilters.artisan.join(','));
      if (newFilters.material.length > 0)
        params.set('material', newFilters.material.join(','));
      if (newFilters.color.length > 0)
        params.set('color', newFilters.color.join(','));
      if (newFilters.rating > 0)
        params.set('rating', newFilters.rating.toString());

      setSearchParams(params);
    },
    [availableOptions.priceRange, setSearchParams]
  );

  // Analytics tracking
  const trackFilterUsage = useCallback(
    async (analytics: FilterAnalytics) => {
      if (!enableAnalytics) return;

      try {
        // Log to user activity
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await supabase.rpc('log_user_activity', {
            p_user_id: user.id,
            p_activity_type: 'PRODUCT_SEARCH',
            p_description: `Searched for "${analytics.searchQuery}" with filters`,
            p_metadata: {
              filters: analytics.filters,
              resultCount: analytics.resultCount,
              timestamp: analytics.timestamp,
            },
          });
        }

        // Track popular search terms and filters
        if (analytics.searchQuery.trim()) {
          setSearchHistory((prev) => {
            const updated = [
              analytics.searchQuery,
              ...prev.filter((q) => q !== analytics.searchQuery),
            ];
            return updated.slice(0, 10); // Keep last 10 searches
          });
        }
      } catch (error) {
        console.error('Analytics tracking error:', error);
      }
    },
    [enableAnalytics]
  );

  // Update filters immediately for responsive UI
  const updateFilters = useCallback(
    (newFilters: Partial<AdvancedFilterOptions>) => {
      const updatedFilters = { ...filters, ...newFilters };

      // Update state immediately - no transition delay
      setFilters(updatedFilters);
      updateUrlParams(updatedFilters);

      // Prefetch related searches for better UX
      if (newFilters.searchQuery && newFilters.searchQuery.length > 2) {
        prefetchRelatedSearch(newFilters.searchQuery);
      }

      // Track analytics (non-blocking)
      trackFilterUsage({
        searchQuery: updatedFilters.searchQuery,
        filters: newFilters,
        resultCount: 0,
        timestamp: Date.now(),
      });
    },
    [filters, updateUrlParams, trackFilterUsage, prefetchRelatedSearch]
  );

  // Reset all filters
  const resetFilters = useCallback(() => {
    const defaultFilters: AdvancedFilterOptions = {
      searchQuery: '',
      category: [],
      priceRange: [
        availableOptions.priceRange.min,
        availableOptions.priceRange.max,
      ],
      sortBy: 'name',
      isNew: false,
      inStock: true,
      artisan: [],
      material: [],
      color: [],
      rating: 0,
    };

    setFilters(defaultFilters);
    updateUrlParams(defaultFilters);
  }, [availableOptions.priceRange, updateUrlParams]);

  // Clear specific filter
  const clearFilter = useCallback(
    (filterKey: keyof AdvancedFilterOptions) => {
      const clearedFilters: Partial<AdvancedFilterOptions> = {};

      switch (filterKey) {
        case 'searchQuery':
          clearedFilters.searchQuery = '';
          break;
        case 'category':
          clearedFilters.category = [];
          break;
        case 'priceRange':
          clearedFilters.priceRange = [
            availableOptions.priceRange.min,
            availableOptions.priceRange.max,
          ];
          break;
        case 'isNew':
          clearedFilters.isNew = false;
          break;
        case 'inStock':
          clearedFilters.inStock = true;
          break;
        case 'artisan':
          clearedFilters.artisan = [];
          break;
        case 'material':
          clearedFilters.material = [];
          break;
        case 'color':
          clearedFilters.color = [];
          break;
        case 'rating':
          clearedFilters.rating = 0;
          break;
      }

      updateFilters(clearedFilters);
    },
    [availableOptions.priceRange, updateFilters]
  );

  // Get search suggestions
  const getSearchSuggestions = useCallback(
    (query: string): string[] => {
      if (!query.trim()) return [];

      const suggestions = new Set<string>();
      const queryLower = query.toLowerCase();

      // Product name suggestions
      products.forEach((product) => {
        if (product.name.toLowerCase().includes(queryLower)) {
          suggestions.add(product.name);
        }
        if (product.category.toLowerCase().includes(queryLower)) {
          suggestions.add(product.category);
        }
        if (
          product.artisan &&
          product.artisan.toLowerCase().includes(queryLower)
        ) {
          suggestions.add(product.artisan);
        }
      });

      return Array.from(suggestions).slice(0, 5);
    },
    [products]
  );

  // Calculate active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.searchQuery.trim()) count++;
    if (filters.category.length > 0) count++;
    if (
      filters.priceRange[0] > availableOptions.priceRange.min ||
      filters.priceRange[1] < availableOptions.priceRange.max
    )
      count++;
    if (filters.isNew) count++;
    if (!filters.inStock) count++;
    if (filters.artisan.length > 0) count++;
    if (filters.material.length > 0) count++;
    if (filters.color.length > 0) count++;
    if (filters.rating > 0) count++;
    return count;
  }, [filters, availableOptions.priceRange]);

  return {
    filters,
    filteredProducts,
    availableOptions,
    searchHistory,
    popularFilters,
    isLoading: isCacheLoading,
    isFetching,
    isSearchStale: deferredSearchQuery !== filters.searchQuery || isStale,
    activeFiltersCount,
    updateFilters,
    resetFilters,
    clearFilter,
    getSearchSuggestions,
    getCacheStats,
    invalidateCache,
    totalProducts: products.length,
    filteredCount: filteredProducts.length,
  };
};
