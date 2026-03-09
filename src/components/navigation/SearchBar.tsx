import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  variant: 'desktop' | 'mobile';
  isMenuOpen?: boolean;
}

export const SearchBar = ({ searchQuery, onSearchChange, onSubmit, variant, isMenuOpen }: SearchBarProps) => {
  const { t } = useTranslation('common');

  if (variant === 'desktop') {
    return (
      <div className="absolute top-full left-0 right-0 bg-background border-b border-border shadow-lg z-dropdown hidden md:block">
        <div className="container mx-auto px-4 md:px-6 lg:px-4 py-4 md:py-6 lg:py-4">
          <form onSubmit={onSubmit} className="flex gap-3 md:gap-4 lg:gap-2">
            <Input
              name="search"
              type="text"
              placeholder={t('nav.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="flex-1 h-11 md:h-12 lg:h-11 text-base md:text-lg lg:text-base rounded-lg border-border focus:border-primary focus:ring-primary touch-manipulation"
              autoFocus
            />
            <Button type="submit" disabled={!searchQuery.trim()} className="bg-primary hover:bg-primary/90 px-4 md:px-6 lg:px-4 h-11 md:h-12 lg:h-11 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 touch-manipulation">
              <Search size={18} className="md:w-5 md:h-5 lg:w-[18px] lg:h-[18px]" />
              <span className="ml-2 text-base md:text-lg lg:text-base font-medium">{t('nav.search')}</span>
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 border-b border-border">
      <form onSubmit={onSubmit} className="flex gap-2">
        <Input
          name="search"
          type="text"
          placeholder={t('nav.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1 rounded-lg"
          tabIndex={isMenuOpen ? 0 : -1}
        />
        <Button type="submit" disabled={!searchQuery.trim()} size="sm" className="bg-primary hover:bg-primary/90" tabIndex={isMenuOpen ? 0 : -1}>
          <Search size={16} />
        </Button>
      </form>
    </div>
  );
};
