import { GitCompareArrows, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useCompareStore } from '@/stores/compareStore';
import { hapticFeedback } from '@/utils/haptics';

/**
 * Floating bar that appears when products are selected for comparison
 */
export const CompareFloatingBar = () => {
  const { t } = useTranslation('products');
  const { items, clear } = useCompareStore();

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-card border border-border rounded-full shadow-xl px-6 py-3 flex items-center gap-4 animate-fade-in">
      <GitCompareArrows className="h-5 w-5 text-primary" />
      <span className="text-sm font-medium text-foreground">
        {t('compare.selected', '{{count}} sélectionné(s)', {
          count: items.length,
        })}
      </span>
      <Button asChild size="sm" className="rounded-full">
        <Link to="/compare">{t('compare.compareNow', 'Comparer')}</Link>
      </Button>
      <button
        onClick={() => {
          hapticFeedback('light');
          clear();
        }}
        className="text-muted-foreground hover:text-foreground transition-colors p-1"
        aria-label={t('compare.clearAll', 'Tout effacer')}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
