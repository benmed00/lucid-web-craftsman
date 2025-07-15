import { useState, useMemo } from 'react';
import { Product } from '@/shared/interfaces/Iproduct.interface'; // Assuming this path is correct

export type SortOption = 'popular' | 'price-asc' | 'price-desc' | 'newest';
export type FilterOption = string; // Typically category name or 'all'

interface UseProductFiltersReturn {
  filteredAndSortedProducts: Product[];
  activeFilter: FilterOption;
  setActiveFilter: React.Dispatch<React.SetStateAction<FilterOption>>;
  currentSort: SortOption;
  setCurrentSort: React.Dispatch<React.SetStateAction<SortOption>>;
}

export const useProductFilters = (
  initialProducts: Product[] = [] // Default to empty array to prevent issues if undefined
): UseProductFiltersReturn => {
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all');
  const [currentSort, setCurrentSort] = useState<SortOption>('popular');

  const filteredAndSortedProducts = useMemo(() => {
    let processedProducts = [...initialProducts];

    // Apply filtering
    if (activeFilter !== 'all') {
      processedProducts = processedProducts.filter(
        (product) => product.category.toLowerCase() === activeFilter.toLowerCase()
      );
    }

    // Apply sorting
    // TODO: Implement more sophisticated sorting for 'popular' and 'newest' if data supports it
    switch (currentSort) {
      case 'price-asc':
        processedProducts.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        processedProducts.sort((a, b) => b.price - a.price);
        break;
      // case 'newest':
      //   // Assuming products have a 'dateAdded' or similar property
      //   // processedProducts.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
      //   break;
      // case 'popular':
      //   // Assuming products have a 'popularityScore' or similar property
      //   // processedProducts.sort((a, b) => b.popularityScore - a.popularityScore);
      //   break;
      default:
        // 'popular' or other unhandled sorts might just use the default order from filtering
        break;
    }

    return processedProducts;
  }, [initialProducts, activeFilter, currentSort]);

  return {
    filteredAndSortedProducts,
    activeFilter,
    setActiveFilter,
    currentSort,
    setCurrentSort,
  };
};
