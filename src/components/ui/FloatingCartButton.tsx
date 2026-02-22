import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCartUI } from '@/hooks/useCartUI';
import clsx from 'clsx';

const FloatingCartButton = () => {
  const { itemCount } = useCartUI();

  // Don't show if cart is empty
  if (itemCount === 0) return null;

  return (
    <Link
      to="/cart"
      className={clsx(
        'fixed bottom-6 right-4 z-40 md:hidden',
        'pb-[env(safe-area-inset-bottom)]',
        'animate-in slide-in-from-bottom-4 fade-in duration-300'
      )}
      aria-label={`Voir le panier (${itemCount} article${itemCount > 1 ? 's' : ''})`}
    >
      <div
        className={clsx(
          'relative flex items-center justify-center',
          'w-14 h-14 sm:w-16 sm:h-16',
          'bg-primary text-primary-foreground',
          'rounded-full shadow-lg shadow-primary/30',
          'transition-all duration-300',
          'hover:scale-105 hover:shadow-xl hover:shadow-primary/40',
          'active:scale-95 touch-manipulation'
        )}
      >
        <ShoppingBag className="h-6 w-6 sm:h-7 sm:w-7" />

        {/* Item count badge */}
        <span
          className={clsx(
            'absolute -top-1 -right-1',
            'flex items-center justify-center',
            'min-w-[22px] h-[22px] sm:min-w-[24px] sm:h-[24px]',
            'bg-destructive text-destructive-foreground',
            'text-xs sm:text-sm font-bold',
            'rounded-full px-1.5',
            'shadow-md',
            'animate-in zoom-in duration-200'
          )}
        >
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      </div>
    </Link>
  );
};

export default FloatingCartButton;
