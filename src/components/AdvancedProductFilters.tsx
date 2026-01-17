import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  X, 
  SlidersHorizontal, 
  Star,
  Palette,
  User,
  Package,
  TrendingUp,
  Clock,
  ChevronDown,
  Sparkles,
  Target,
  Trash2,
  Database
} from 'lucide-react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { AdvancedFilterOptions } from '@/hooks/useAdvancedProductFilters';
import { useTranslation } from 'react-i18next';

interface CacheStats {
  cachedQueries: number;
  totalCacheSize: number;
}

interface AdvancedProductFiltersProps {
  filters: AdvancedFilterOptions;
  availableOptions: {
    categories: string[];
    artisans: string[];
    materials: string[];
    colors: string[];
    priceRange: { min: number; max: number };
  };
  searchHistory: string[];
  isLoading: boolean;
  totalProducts: number;
  filteredCount: number;
  activeFiltersCount: number;
  onFiltersChange: (filters: Partial<AdvancedFilterOptions>) => void;
  onResetFilters: () => void;
  onClearFilter: (filterType: keyof AdvancedFilterOptions) => void;
  getSearchSuggestions: (query: string) => string[];
  onClearCache?: () => void;
  cacheStats?: CacheStats;
}

export const AdvancedProductFilters: React.FC<AdvancedProductFiltersProps> = ({
  filters,
  availableOptions,
  searchHistory,
  isLoading,
  totalProducts,
  filteredCount,
  activeFiltersCount,
  onFiltersChange,
  onResetFilters,
  onClearFilter,
  getSearchSuggestions,
  onClearCache,
  cacheStats
}) => {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation('products');

  // Handle search input changes with suggestions
  const handleSearchChange = (value: string) => {
    onFiltersChange({ searchQuery: value });
    
    if (value.trim()) {
      const suggestions = getSearchSuggestions(value);
      setSearchSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: string) => {
    onFiltersChange({ searchQuery: suggestion });
    setShowSuggestions(false);
  };

  // Rating stars component
  const RatingFilter = () => (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          onClick={() => onFiltersChange({ rating: rating === filters.rating ? 0 : rating })}
          className="focus:outline-none focus:ring-2 focus:ring-primary rounded"
        >
          <Star 
            className={`h-5 w-5 ${
              rating <= filters.rating 
                ? 'fill-yellow-400 text-yellow-400' 
                : 'text-gray-300'
            }`}
          />
        </button>
      ))}
        {filters.rating > 0 && (
          <span className="text-sm text-muted-foreground ml-2">
            {filters.rating}+ {t('advancedFilters.stars')}
          </span>
        )}
      </div>
    );

  return (
    <div className="w-full space-y-6">
      {/* Advanced Search Bar with Suggestions */}
      <div className="relative">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input with Autocomplete */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder={t('advancedFilters.searchPlaceholder')}
              value={filters.searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => setShowSuggestions(searchSuggestions.length > 0)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="pl-10 pr-12"
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
            
            {/* Search Suggestions Dropdown */}
            {showSuggestions && searchSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 bg-popover border border-border rounded-md shadow-lg mt-1 max-h-60 overflow-auto">
                <div className="p-2">
                  <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    {t('advancedFilters.suggestions')}
                  </div>
                  {searchSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionSelect(suggestion)}
                      className="w-full text-left px-3 py-2 hover:bg-accent rounded-md text-sm text-foreground"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
                {searchHistory.length > 0 && (
                  <div className="border-t border-border p-2">
                    <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {t('advancedFilters.recentSearches')}
                    </div>
                    {searchHistory.slice(0, 3).map((query, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionSelect(query)}
                        className="w-full text-left px-3 py-2 hover:bg-accent rounded-md text-sm text-muted-foreground"
                      >
                        {query}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sort & Filter Controls */}
          <div className="flex gap-2">
            <Select
              value={filters.sortBy}
              onValueChange={(value: AdvancedFilterOptions['sortBy']) => 
                onFiltersChange({ sortBy: value })}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">{t('filters.sortOptions.nameAsc')}</SelectItem>
                <SelectItem value="price-asc">{t('filters.sortOptions.priceAsc')}</SelectItem>
                <SelectItem value="price-desc">{t('filters.sortOptions.priceDesc')}</SelectItem>
                <SelectItem value="newest">{t('filters.sortOptions.newest')}</SelectItem>
                <SelectItem value="popularity">{t('filters.sortOptions.popular')}</SelectItem>
                <SelectItem value="rating">{t('advancedFilters.bestRated')}</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
              className="flex items-center gap-2"
            >
              <SlidersHorizontal size={16} />
              {t('filters.filtersButton')}
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Results Info & Quick Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            {isLoading && <span className="h-4 w-4 animate-spin border-2 border-muted-foreground border-t-transparent rounded-full inline-block" />}
            {filteredCount === totalProducts ? (
              <span>{t('filters.resultsCount', { count: totalProducts })}</span>
            ) : (
              <span>{t('filters.resultsFiltered', { filtered: filteredCount, total: totalProducts })}</span>
            )}
          </span>
          
          {filteredCount > 0 && filteredCount < totalProducts && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              {t('advancedFilters.filteredResults')}
            </Badge>
          )}
        </div>
        
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            {t('filters.clearAllFilters')}
          </Button>
        )}
        
        {/* Cache Clear Button */}
        {onClearCache && cacheStats && cacheStats.cachedQueries > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearCache}
            className="text-muted-foreground hover:text-foreground flex items-center gap-2"
            title={t('advancedFilters.cachedQueries', { count: cacheStats.cachedQueries })}
          >
            <Database className="h-3 w-3" />
            <span className="hidden sm:inline">{t('advancedFilters.clearCache')}</span>
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full ml-1">
              {cacheStats.cachedQueries}
            </span>
          </Button>
        )}
      </div>

      {/* Active Filters Tags */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.searchQuery && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Search className="h-3 w-3" />
              "{filters.searchQuery}"
              <X 
                size={12} 
                className="cursor-pointer hover:text-red-500"
                onClick={() => onClearFilter('searchQuery')}
              />
            </Badge>
          )}
          
          {filters.category.map(category => (
            <Badge key={category} variant="secondary" className="flex items-center gap-1">
              <Package className="h-3 w-3" />
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
          
          {(filters.priceRange[0] > availableOptions.priceRange.min || 
            filters.priceRange[1] < availableOptions.priceRange.max) && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {filters.priceRange[0]}€ - {filters.priceRange[1]}€
              <X 
                size={12} 
                className="cursor-pointer hover:text-red-500"
                onClick={() => onClearFilter('priceRange')}
              />
            </Badge>
          )}
          
          {filters.rating > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Star className="h-3 w-3" />
              {filters.rating}+ {t('advancedFilters.stars')}
              <X 
                size={12} 
                className="cursor-pointer hover:text-red-500"
                onClick={() => onClearFilter('rating')}
              />
            </Badge>
          )}
          
          {filters.isNew && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              {t('filters.newOnly')}
              <X 
                size={12} 
                className="cursor-pointer hover:text-red-500"
                onClick={() => onClearFilter('isNew')}
              />
            </Badge>
          )}
          
          {!filters.inStock && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Package className="h-3 w-3" />
              {t('advancedFilters.includeOutOfStock')}
              <X 
                size={12} 
                className="cursor-pointer hover:text-red-500"
                onClick={() => onClearFilter('inStock')}
              />
            </Badge>
          )}
        </div>
      )}

      {/* Advanced Filters Panel */}
      <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
        <CollapsibleContent>
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter size={18} />
                {t('filters.advancedFilters')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Categories */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    {t('filters.category')}
                  </Label>
                  <div className="space-y-2 max-h-40 overflow-auto">
                    {availableOptions.categories.map(category => (
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
                          className="text-sm cursor-pointer text-muted-foreground flex-1"
                        >
                          {category}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price & Rating */}
                <div className="space-y-6">
                  {/* Price Range */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      {t('filters.priceRange')}: {filters.priceRange[0]}€ - {filters.priceRange[1]}€
                    </Label>
                    <div className="px-2">
                      <Slider
                        value={filters.priceRange}
                        onValueChange={(value) => onFiltersChange({ priceRange: value as [number, number] })}
                        max={availableOptions.priceRange.max}
                        min={availableOptions.priceRange.min}
                        step={5}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>{availableOptions.priceRange.min}€</span>
                        <span>{availableOptions.priceRange.max}€</span>
                      </div>
                    </div>
                  </div>

                  {/* Rating Filter */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Star className="h-4 w-4" />
                      {t('advancedFilters.minRating')}
                    </Label>
                    <RatingFilter />
                  </div>
                </div>

                {/* Advanced Options */}
                <div className="space-y-6">
                  {availableOptions.artisans.length > 0 && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {t('advancedFilters.artisans')}
                      </Label>
                      <div className="space-y-2 max-h-32 overflow-auto">
                        {availableOptions.artisans.map(artisan => (
                          <div key={artisan} className="flex items-center space-x-2">
                            <Checkbox
                              id={`artisan-${artisan}`}
                              checked={filters.artisan.includes(artisan)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  onFiltersChange({ 
                                    artisan: [...filters.artisan, artisan] 
                                  });
                                } else {
                                  onFiltersChange({ 
                                    artisan: filters.artisan.filter(a => a !== artisan) 
                                  });
                                }
                              }}
                            />
                            <Label 
                              htmlFor={`artisan-${artisan}`} 
                              className="text-sm cursor-pointer text-muted-foreground flex-1"
                            >
                              {artisan}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Special Options */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-foreground">
                      {t('filters.specialOptions')}
                    </Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="isNew"
                          checked={filters.isNew}
                          onCheckedChange={(checked) => onFiltersChange({ isNew: !!checked })}
                        />
                        <Label htmlFor="isNew" className="text-sm cursor-pointer text-muted-foreground flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          {t('filters.newOnly')}
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="inStock"
                          checked={filters.inStock}
                          onCheckedChange={(checked) => onFiltersChange({ inStock: !!checked })}
                        />
                        <Label htmlFor="inStock" className="text-sm cursor-pointer text-muted-foreground flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          {t('advancedFilters.inStockOnly')}
                        </Label>
                      </div>
                    </div>
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