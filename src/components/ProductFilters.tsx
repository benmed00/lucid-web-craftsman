import { useState } from 'react';
import { Search, Filter, X, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { FilterOptions } from '@/hooks/useProductFilters';

interface ProductFiltersProps {
  filters: FilterOptions;
  availableCategories: string[];
  priceRange: { min: number; max: number };
  totalProducts: number;
  filteredCount: number;
  activeFiltersCount: number;
  onFiltersChange: (filters: Partial<FilterOptions>) => void;
  onResetFilters: () => void;
  onClearFilter: (filterType: keyof FilterOptions) => void;
}

export const ProductFilters = ({
  filters,
  availableCategories,
  priceRange,
  totalProducts,
  filteredCount,
  activeFiltersCount,
  onFiltersChange,
  onResetFilters,
  onClearFilter
}: ProductFiltersProps) => {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  return (
    <div className="w-full">
      {/* Mobile Filter Toggle & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400" size={20} />
          <Input
            type="text"
            placeholder="Rechercher des produits..."
            value={filters.searchQuery}
            onChange={(e) => onFiltersChange({ searchQuery: e.target.value })}
            className="pl-10 pr-4"
          />
          {filters.searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onClearFilter('searchQuery')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            >
              <X size={14} />
            </Button>
          )}
        </div>

        {/* Sort & Filter Toggle */}
        <div className="flex gap-2">
          <Select
            value={filters.sortBy}
            onValueChange={(value: FilterOptions['sortBy']) => onFiltersChange({ sortBy: value })}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Nom A-Z</SelectItem>
              <SelectItem value="price-asc">Prix croissant</SelectItem>
              <SelectItem value="price-desc">Prix décroissant</SelectItem>
              <SelectItem value="newest">Nouveautés</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            className="flex items-center gap-2"
          >
            <SlidersHorizontal size={16} />
            Filtres
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Results Info */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-stone-600">
          {filteredCount === totalProducts ? (
            `${totalProducts} produits`
          ) : (
            `${filteredCount} sur ${totalProducts} produits`
          )}
        </p>
        
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetFilters}
            className="text-stone-600 hover:text-stone-800"
          >
            Effacer tous les filtres
          </Button>
        )}
      </div>

      {/* Active Filters Tags */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {filters.category.map(category => (
            <Badge key={category} variant="secondary" className="flex items-center gap-1">
              {category}
              <X 
                size={12} 
                className="cursor-pointer hover:text-red-500"
                onClick={() => onFiltersChange({ 
                  category: filters.category.filter(c => c !== category) 
                })}
              />
            </Badge>
          ))}
          
          {(filters.priceRange[0] !== priceRange.min || filters.priceRange[1] !== priceRange.max) && (
            <Badge variant="secondary" className="flex items-center gap-1">
              {filters.priceRange[0]}€ - {filters.priceRange[1]}€
              <X 
                size={12} 
                className="cursor-pointer hover:text-red-500"
                onClick={() => onClearFilter('priceRange')}
              />
            </Badge>
          )}
          
          {filters.searchQuery && (
            <Badge variant="secondary" className="flex items-center gap-1">
              "{filters.searchQuery}"
              <X 
                size={12} 
                className="cursor-pointer hover:text-red-500"
                onClick={() => onClearFilter('searchQuery')}
              />
            </Badge>
          )}
          
          {filters.isNew && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Nouveautés
              <X 
                size={12} 
                className="cursor-pointer hover:text-red-500"
                onClick={() => onClearFilter('isNew')}
              />
            </Badge>
          )}
        </div>
      )}

      {/* Collapsible Filters Panel */}
      <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
        <CollapsibleContent>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter size={18} />
                Filtres avancés
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Categories */}
              <div>
                <Label className="text-sm font-medium text-stone-700 mb-3 block">
                  Catégories
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {availableCategories.map(category => (
                    <div key={category} className="flex items-center space-x-2">
                      <Checkbox
                        id={category}
                        checked={filters.category.includes(category)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            onFiltersChange({ 
                              category: [...filters.category, category] 
                            });
                          } else {
                            onFiltersChange({ 
                              category: filters.category.filter(c => c !== category) 
                            });
                          }
                        }}
                      />
                      <Label 
                        htmlFor={category} 
                        className="text-sm cursor-pointer text-stone-700"
                      >
                        {category}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Price Range */}
              <div>
                <Label className="text-sm font-medium text-stone-700 mb-3 block">
                  Gamme de prix: {filters.priceRange[0]}€ - {filters.priceRange[1]}€
                </Label>
                <div className="px-2">
                  <Slider
                    value={filters.priceRange}
                    onValueChange={(value) => onFiltersChange({ priceRange: value as [number, number] })}
                    max={priceRange.max}
                    min={priceRange.min}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-stone-500 mt-1">
                    <span>{priceRange.min}€</span>
                    <span>{priceRange.max}€</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Special Options */}
              <div>
                <Label className="text-sm font-medium text-stone-700 mb-3 block">
                  Options spéciales
                </Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isNew"
                      checked={filters.isNew}
                      onCheckedChange={(checked) => onFiltersChange({ isNew: !!checked })}
                    />
                    <Label htmlFor="isNew" className="text-sm cursor-pointer text-stone-700">
                      Nouveautés uniquement
                    </Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};