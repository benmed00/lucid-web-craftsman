import React from 'react';
import { Badge } from '@/components/ui/badge';

interface ProductFilterBarProps {
  activeFilter: string;
  onFilterChange: (filterCategory: string) => void;
  currentSort: string; // Example: 'popular', 'price-asc', 'price-desc', 'newest'
  onSortChange: (sortKey: string) => void;
  // We can add more props later, like available categories if they become dynamic
}

const ProductFilterBar: React.FC<ProductFilterBarProps> = ({
  activeFilter,
  onFilterChange,
  currentSort,
  onSortChange,
}) => {
  // Define categories - could be dynamic in a real app
  const categories = [
    { key: 'all', label: 'Tous les produits' },
    { key: 'sacs', label: 'Sacs' },
    { key: 'chapeaux', label: 'Chapeaux' },
    // Add more categories as needed
  ];

  const sortOptions = [
    { key: 'popular', label: 'Trier par: Populaire' },
    { key: 'price-asc', label: 'Prix: Croissant' },
    { key: 'price-desc', label: 'Prix: Décroissant' },
    { key: 'newest', label: 'Nouveautés' },
  ];

  return (
    <div className="container mx-auto px-4 mb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Badge
              key={category.key}
              variant="outline"
              className={`cursor-pointer ${
                activeFilter === category.key
                  ? "border-olive-300 bg-olive-50 text-olive-800"
                  : "border-stone-300 hover:border-olive-300 hover:bg-olive-50 hover:text-olive-800"
              }`}
              onClick={() => onFilterChange(category.key)}
            >
              {category.label}
            </Badge>
          ))}
        </div>

        <div className="flex gap-2">
          <select 
            className="text-sm border border-stone-300 rounded-md py-2 px-3 focus:outline-none focus:border-olive-400"
            value={currentSort}
            onChange={(e) => onSortChange(e.target.value)}
          >
            {sortOptions.map(option => (
              <option key={option.key} value={option.key}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default ProductFilterBar;
