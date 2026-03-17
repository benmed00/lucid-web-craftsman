import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import type { Product } from '@/shared/interfaces/Iproduct.interface';

interface ProductsCategoryFiltersProps {
  filters: { category: string[]; searchQuery: string };
  displayCategories: string[];
  products: Product[];
  totalProductsCount: number;
  updateFilters: (updates: Record<string, unknown>) => void;
}

export const ProductsCategoryFilters = ({
  filters,
  displayCategories,
  products,
  totalProductsCount,
  updateFilters,
}: ProductsCategoryFiltersProps) => {
  const { t } = useTranslation('products');

  if (filters.searchQuery) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-6 md:mb-8 overflow-x-auto mobile-scroll">
      <div className="flex gap-2 min-w-max">
        <Button
          variant={filters.category.length === 0 ? 'default' : 'outline'}
          size="sm"
          className="min-h-[44px] touch-manipulation whitespace-nowrap"
          onClick={() => updateFilters({ category: [] })}
        >
          {t('filters.all')} ({totalProductsCount})
        </Button>
        {displayCategories.map((category) => {
          const categoryCount = products.filter(
            (p) => p.category === category
          ).length;
          const isSelected = filters.category.includes(category);
          return (
            <Button
              key={category}
              variant={isSelected ? 'default' : 'outline'}
              size="sm"
              className="min-h-[44px] touch-manipulation whitespace-nowrap"
              onClick={() => {
                if (isSelected) {
                  updateFilters({
                    category: filters.category.filter((c) => c !== category),
                  });
                } else {
                  updateFilters({ category: [...filters.category, category] });
                }
              }}
            >
              {category} ({categoryCount})
            </Button>
          );
        })}
      </div>
    </div>
  );
};
