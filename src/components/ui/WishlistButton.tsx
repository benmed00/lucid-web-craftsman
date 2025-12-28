import React from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWishlist } from '@/hooks/useWishlist';
import { Button } from '@/components/ui/button';
import { TooltipWrapper } from '@/components/ui/TooltipWrapper';

interface WishlistButtonProps {
  productId: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'ghost' | 'outline';
  showText?: boolean;
}

export const WishlistButton = React.forwardRef<HTMLButtonElement, WishlistButtonProps>(({ 
  productId, 
  className, 
  size = 'md',
  variant = 'ghost',
  showText = false 
}, ref) => {
  const { isInWishlist, toggleWishlist, loading } = useWishlist();
  const isFavorited = isInWishlist(productId);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(productId);
  };

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24
  };

  return (
    <TooltipWrapper 
      content={isFavorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      disabled={showText} // Don't show tooltip if text is already visible
    >
      <Button
        ref={ref}
        variant={variant}
        size={showText ? 'default' : 'icon'}
        onClick={handleClick}
        disabled={loading}
        aria-label={isFavorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        className={cn(
          'transition-all duration-200',
          !showText && sizeClasses[size],
          isFavorited && 'text-status-error hover:text-status-error/80',
          !isFavorited && 'text-muted-foreground hover:text-foreground',
          className
        )}
      >
        <Heart
          size={iconSizes[size]}
          className={cn(
            'transition-all duration-200',
            isFavorited && 'fill-current'
          )}
        />
        {showText && (
          <span className="ml-2">
            {isFavorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          </span>
        )}
      </Button>
    </TooltipWrapper>
  );
});

WishlistButton.displayName = "WishlistButton";