import { Flame, Clock, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { StockInfo } from '@/services/stockService';

interface ScarcityIndicatorProps {
  stockInfo: StockInfo | null;
  productName?: string;
}

export const ScarcityIndicator = ({ stockInfo }: ScarcityIndicatorProps) => {
  const { t } = useTranslation('common');

  if (!stockInfo || stockInfo.isOutOfStock) return null;

  const available = stockInfo.available;

  // Low stock warning (< 5 items)
  if (available > 0 && available <= 5) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-sm font-medium animate-pulse">
        <Flame className="h-4 w-4" />
        <span>
          {t('scarcity.lowStock', {
            count: available,
            defaultValue: `Plus que {{count}} en stock !`,
          })}
        </span>
      </div>
    );
  }

  // Medium stock (< 15) — subtle urgency
  if (available > 5 && available <= 15) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-sm">
        <Clock className="h-4 w-4" />
        <span>{t('scarcity.sellingFast', 'Article populaire — commandez vite')}</span>
      </div>
    );
  }

  return null;
};

export const SocialProofBadge = ({ viewCount }: { viewCount?: number }) => {
  const { t } = useTranslation('common');

  // Simulate realistic view count
  const views = viewCount || Math.floor(Math.random() * 40) + 15;

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Users className="h-3.5 w-3.5" />
      <span>
        {t('socialProof.viewingNow', {
          count: views,
          defaultValue: '{{count}} personnes regardent ce produit',
        })}
      </span>
    </div>
  );
};
