import { useState, useMemo, useCallback, useDeferredValue, useTransition } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Product } from '@/shared/interfaces/Iproduct.interface';
import { supabase } from '@/integrations/supabase/client';

export interface AdvancedFilterOptions {
  searchQuery: string;
  category: string[];
  priceRange: [number, number];
  sortBy: 'name' | 'price-asc' | 'price-desc' | 'newest' | 'popularity' | 'rating';
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
  debounceMs = 300 
}: UseAdvancedProductFiltersOptions) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [popularFilters, setPopularFilters] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  // Initialize filters from URL parameters
  const getInitialFilters = (): AdvancedFilterOptions => ({
    searchQuery: searchParams.get('q') || '',
    category: searchParams.get('category')?.split(',').filter(Boolean) || [],
    priceRange: [
      parseInt(searchParams.get('minPrice') || '0'),
      parseInt(searchParams.get('maxPrice') || '1000')
    ] as [number, number],
    sortBy: (searchParams.get('sort') as AdvancedFilterOptions['sortBy']) || 'name',
    isNew: searchParams.get('new') === 'true',
    inStock: searchParams.get('inStock') !== 'false',
    artisan: searchParams.get('artisan')?.split(',').filter(Boolean) || [],
    material: searchParams.get('material')?.split(',').filter(Boolean) || [],
    color: searchParams.get('color')?.split(',').filter(Boolean) || [],
    rating: parseInt(searchParams.get('rating') || '0'),
  });

  const [filters, setFilters] = useState<AdvancedFilterOptions>(getInitialFilters);
  
  // Use deferred value for search query to avoid blocking UI during typing
  const deferredSearchQuery = useDeferredValue(filters.searchQuery);

  // Extract available filter options from products
  const availableOptions = useMemo(() => {
    const categories = [...new Set(products.map(p => p.category))];
    const artisans = [...new Set(products.map(p => p.artisan).filter(Boolean))];
    // Note: materials and colors are not available in the current Product interface
    const materials: string[] = [];
    const colors: string[] = [];
    
    const priceRange = products.length > 0 ? {
      min: Math.min(...products.map(p => p.price)),
      max: Math.max(...products.map(p => p.price))
    } : { min: 0, max: 1000 };

    return {
      categories,
      artisans,
      materials,
      colors,
      priceRange
    };
  }, [products]);

  // Advanced search with fuzzy matching and scoring - uses deferred value
  const searchProducts = useMemo(() => {
    if (!deferredSearchQuery.trim()) return products;

    const searchTerms = deferredSearchQuery.toLowerCase().split(' ').filter(Boolean);
    
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
        if (searchableText.includes(deferredSearchQuery.toLowerCase())) {
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
        if (product.name.toLowerCase().includes(deferredSearchQuery.toLowerCase())) {
          score += 50;
        }

        return { product, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ product }) => product);
  }, [products, deferredSearchQuery]);

  // Apply all filters
  const filteredProducts = useMemo(() => {
    let filtered = searchProducts;

    // Category filter
    if (filters.category.length > 0) {
      filtered = filtered.filter(p => filters.category.includes(p.category));
    }

    // Price range filter
    filtered = filtered.filter(p => 
      p.price >= filters.priceRange[0] && p.price <= filters.priceRange[1]
    );

    // New products filter
    if (filters.isNew) {
      filtered = filtered.filter(p => p.new || p.is_new);
    }

    // Stock filter (simplified - assuming all products are in stock for now)
    if (filters.inStock) {
      // Note: stock_quantity not available in current Product interface
      // For now, we'll assume all products are in stock unless we add stock data
      filtered = filtered; // No filtering for stock
    }

    // Artisan filter
    if (filters.artisan.length > 0) {
      filtered = filtered.filter(p => p.artisan && filters.artisan.includes(p.artisan));
    }

    // Material filter (not available in current interface)
    // Skip material filtering for now
    
    // Color filter (not available in current interface)  
    // Skip color filtering for now

    // Rating filter (not available in current interface)
    // Skip rating filtering for now

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
          // Simplified popularity based on name (since rating_count not available)
          return b.name.length - a.name.length;
        case 'rating':
          // No rating data available, fallback to alphabetical
          return a.name.localeCompare(b.name);
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });
  }, [searchProducts, filters]);

  // Update URL parameters
  const updateUrlParams = useCallback((newFilters: AdvancedFilterOptions) => {
    const params = new URLSearchParams();
    
    if (newFilters.searchQuery) params.set('q', newFilters.searchQuery);
    if (newFilters.category.length > 0) params.set('category', newFilters.category.join(','));
    if (newFilters.priceRange[0] > availableOptions.priceRange.min) {
      params.set('minPrice', newFilters.priceRange[0].toString());
    }
    if (newFilters.priceRange[1] < availableOptions.priceRange.max) {
      params.set('maxPrice', newFilters.priceRange[1].toString());
    }
    if (newFilters.sortBy !== 'name') params.set('sort', newFilters.sortBy);
    if (newFilters.isNew) params.set('new', 'true');
    if (!newFilters.inStock) params.set('inStock', 'false');
    if (newFilters.artisan.length > 0) params.set('artisan', newFilters.artisan.join(','));
    if (newFilters.material.length > 0) params.set('material', newFilters.material.join(','));
    if (newFilters.color.length > 0) params.set('color', newFilters.color.join(','));
    if (newFilters.rating > 0) params.set('rating', newFilters.rating.toString());

    setSearchParams(params);
  }, [availableOptions.priceRange, setSearchParams]);

  // Analytics tracking
  const trackFilterUsage = useCallback(async (analytics: FilterAnalytics) => {
    if (!enableAnalytics) return;

    try {
      // Log to user activity
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.rpc('log_user_activity', {
          p_user_id: user.id,
          p_activity_type: 'PRODUCT_SEARCH',
          p_description: `Searched for "${analytics.searchQuery}" with filters`,
          p_metadata: {
            filters: analytics.filters,
            resultCount: analytics.resultCount,
            timestamp: analytics.timestamp
          }
        });
      }

      // Track popular search terms and filters
      if (analytics.searchQuery.trim()) {
        setSearchHistory(prev => {
          const updated = [analytics.searchQuery, ...prev.filter(q => q !== analytics.searchQuery)];
          return updated.slice(0, 10); // Keep last 10 searches
        });
      }

    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
  }, [enableAnalytics]);

  // Update filters with transition for non-urgent updates
  const updateFilters = useCallback(
    (newFilters: Partial<AdvancedFilterOptions>) => {
      const updatedFilters = { ...filters, ...newFilters };
      
      // Use startTransition for filter changes to keep UI responsive
      startTransition(() => {
        setFilters(updatedFilters);
        updateUrlParams(updatedFilters);
      });

      // Track analytics (non-blocking)
      trackFilterUsage({
        searchQuery: updatedFilters.searchQuery,
        filters: newFilters,
        resultCount: 0,
        timestamp: Date.now()
      });
    },
    [filters, updateUrlParams, trackFilterUsage]
  );

  // Reset all filters
  const resetFilters = useCallback(() => {
    const defaultFilters: AdvancedFilterOptions = {
      searchQuery: '',
      category: [],
      priceRange: [availableOptions.priceRange.min, availableOptions.priceRange.max],
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
  const clearFilter = useCallback((filterKey: keyof AdvancedFilterOptions) => {
    const clearedFilters: Partial<AdvancedFilterOptions> = {};
    
    switch (filterKey) {
      case 'searchQuery':
        clearedFilters.searchQuery = '';
        break;
      case 'category':
        clearedFilters.category = [];
        break;
      case 'priceRange':
        clearedFilters.priceRange = [availableOptions.priceRange.min, availableOptions.priceRange.max];
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
  }, [availableOptions.priceRange, updateFilters]);

  // Get search suggestions
  const getSearchSuggestions = useCallback((query: string): string[] => {
    if (!query.trim()) return [];

    const suggestions = new Set<string>();
    const queryLower = query.toLowerCase();

    // Product name suggestions
    products.forEach(product => {
      if (product.name.toLowerCase().includes(queryLower)) {
        suggestions.add(product.name);
      }
      if (product.category.toLowerCase().includes(queryLower)) {
        suggestions.add(product.category);
      }
      if (product.artisan && product.artisan.toLowerCase().includes(queryLower)) {
        suggestions.add(product.artisan);
      }
    });

    return Array.from(suggestions).slice(0, 5);
  }, [products]);

  // Calculate active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.searchQuery.trim()) count++;
    if (filters.category.length > 0) count++;
    if (filters.priceRange[0] > availableOptions.priceRange.min || 
        filters.priceRange[1] < availableOptions.priceRange.max) count++;
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
    isLoading: isPending, // Show loading during transitions
    isSearchStale: deferredSearchQuery !== filters.searchQuery, // Indicates search is pending
    activeFiltersCount,
    updateFilters,
    resetFilters,
    clearFilter,
    getSearchSuggestions,
    totalProducts: products.length,
    filteredCount: filteredProducts.length,
  };
};