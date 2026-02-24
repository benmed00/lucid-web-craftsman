// src/components/ui/RemainingSlots.tsx
// Displays remaining slots for cart/wishlist limits

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface RemainingSlotsProps {
  current: number;
  max: number;
  label?: string;
  showWhenFull?: boolean;
  className?: string;
}

export const RemainingSlots: React.FC<RemainingSlotsProps> = ({
  current,
  max,
  label,
  showWhenFull = true,
  className,
}) => {
  const { t } = useTranslation('checkout');
  const remaining = max - current;
  const isFull = remaining <= 0;
  const isNearFull = remaining <= 2 && remaining > 0;

  const displayLabel = label || t('cart.slots.products');

  if (!showWhenFull && isFull) return null;
  if (current === 0) return null;

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1.5 font-normal text-xs',
        isFull && 'border-destructive/50 bg-destructive/10 text-destructive',
        isNearFull &&
          'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400',
        !isFull &&
          !isNearFull &&
          'border-muted-foreground/30 text-muted-foreground',
        className
      )}
    >
      {isFull ? (
        <>
          <AlertTriangle className="h-3 w-3" />
          {t('cart.slots.limitReached')}
        </>
      ) : (
        <>
          <Info className="h-3 w-3" />
          {t('cart.slots.remaining', { count: remaining, label: displayLabel })}
        </>
      )}
    </Badge>
  );
};

export default RemainingSlots;
