import React from 'react';
import { ShoppingBag, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useCartUI } from '@/context/useCartUI';
import clsx from 'clsx';

const FloatingCartButton = () => {
  const { itemCount } = useCartUI();

  return (
    <Link 
      to="/cart" 
      className="fixed bottom-6 right-6 z-40 md:hidden pb-[env(safe-area-inset-bottom)]"
      aria-label={`Voir le panier (${itemCount} article${itemCount > 1 ? 's' : ''})`}
    >
      <Button
        className={clsx(
          "h-14 w-14 rounded-full shadow-2xl border-2 transition-all duration-300 hover:scale-110 active:scale-95 touch-manipulation",
          itemCount > 0
            ? "bg-primary hover:bg-primary/90 text-primary-foreground border-primary/80 shadow-primary/30"
            : "bg-background hover:bg-muted text-foreground border-border shadow-muted/30"
        )}
      >
        <div className="relative">
          <ShoppingBag className="h-6 w-6" />
          {itemCount > 0 && (
            <div className="absolute -top-3 -right-3 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center shadow-lg">
              {itemCount > 99 ? '99+' : itemCount}
            </div>
          )}
        </div>
      </Button>
    </Link>
  );
};

export default FloatingCartButton;