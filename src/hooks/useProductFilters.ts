import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Product,
  getArtisanStory,
  isProductNew,
} from '@/shared/interfaces/Iproduct.interface';

export interface FilterOptions {
  category: string[];
  priceRange: [number, number];
  sortBy: 'name' | 'price-asc' | 'price-desc' | 'newest';
  searchQuery: string;
  inStock: boolean;
  isNew: boolean;
}

interface UseProductFiltersProps {
  products: Product[];
}

export const useProductFilters = ({ products }: UseProductFiltersProps) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState<FilterOptions>({
    category: searchParams.getAll('category') || [],
    priceRange: [
      parseInt(searchParams.get('minPrice') || '0'),
      parseInt(searchParams.get('maxPrice') || '200'),
    ],
    sortBy: (searchParams.get('sortBy') as FilterOptions['sortBy']) || 'name',
    searchQuery: searchParams.get('q') || '',
    inStock: searchParams.get('inStock') === 'true',
    isNew: searchParams.get('isNew') === 'true',
  });

  // Available categories from products
  const availableCategories = useMemo(() => {
    const categories = [...new Set(products.map((p) => p.category))];
    return categories.sort();
  }, [products]);

  // Price range bounds
  const priceRange = useMemo(() => {
    const prices = products.map((p) => p.price);
    return {
      min: Math.floor(Math.min(...prices)),
      max: Math.ceil(Math.max(...prices)),
    };
  }, [products]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    const filtered = products.filter((product) => {
      // Category filter
      if (
        filters.category.length > 0 &&
        !filters.category.includes(product.category)
      ) {
        return false;
      }

      // Price range filter
      if (
        product.price < filters.priceRange[0] ||
        product.price > filters.priceRange[1]
      ) {
        return false;
      }

      // Search query filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const searchFields = [
          product.name,
          product.description,
          product.category,
          product.artisan,
          getArtisanStory(product),
        ].filter(Boolean);

        const matches = searchFields.some((field) =>
          field?.toLowerCase().includes(query)
        );

        if (!matches) return false;
      }

      // New products filter
      if (filters.isNew && !isProductNew(product)) {
        return false;
      }

      return true;
    });

    // Sort products
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'newest':
          // Prioritize new products, then by creation date if available
          if ((a.new || a.is_new) && !(b.new || b.is_new)) return -1;
          if (!(a.new || a.is_new) && (b.new || b.is_new)) return 1;
          return a.name.localeCompare(b.name);
        default: // 'name'
          return a.name.localeCompare(b.name);
      }
    });

    return filtered;
  }, [products, filters]);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();

    // Add non-empty filters to URL
    if (filters.category.length > 0) {
      filters.category.forEach((cat) => params.append('category', cat));
    }
    if (filters.priceRange[0] !== priceRange.min) {
      params.set('minPrice', filters.priceRange[0].toString());
    }
    if (filters.priceRange[1] !== priceRange.max) {
      params.set('maxPrice', filters.priceRange[1].toString());
    }
    if (filters.sortBy !== 'name') {
      params.set('sortBy', filters.sortBy);
    }
    if (filters.searchQuery) {
      params.set('q', filters.searchQuery);
    }
    if (filters.isNew) {
      params.set('isNew', 'true');
    }

    setSearchParams(params, { replace: true });
  }, [filters, priceRange.min, priceRange.max, setSearchParams]);

  const updateFilters = (newFilters: Partial<FilterOptions>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const resetFilters = () => {
    setFilters({
      category: [],
      priceRange: [priceRange.min, priceRange.max],
      sortBy: 'name',
      searchQuery: '',
      inStock: false,
      isNew: false,
    });
  };

  const clearFilter = (filterType: keyof FilterOptions) => {
    switch (filterType) {
      case 'category':
        updateFilters({ category: [] });
        break;
      case 'priceRange':
        updateFilters({ priceRange: [priceRange.min, priceRange.max] });
        break;
      case 'searchQuery':
        updateFilters({ searchQuery: '' });
        break;
      case 'isNew':
        updateFilters({ isNew: false });
        break;
    }
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.category.length > 0) count++;
    if (
      filters.priceRange[0] !== priceRange.min ||
      filters.priceRange[1] !== priceRange.max
    )
      count++;
    if (filters.searchQuery) count++;
    if (filters.isNew) count++;
    return count;
  }, [filters, priceRange]);

  return {
    filters,
    filteredProducts,
    availableCategories,
    priceRange,
    updateFilters,
    resetFilters,
    clearFilter,
    activeFiltersCount,
    totalProducts: products.length,
    filteredCount: filteredProducts.length,
  };
};
