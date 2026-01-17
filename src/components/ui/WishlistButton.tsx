import React from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWishlist } from '@/hooks/useWishlist';
import { Button } from '@/components/ui/button';
import { TooltipWrapper } from '@/components/ui/TooltipWrapper';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('common');
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

  const tooltipText = isFavorited ? t('wishlist.remove') : t('wishlist.add');

  return (
    <TooltipWrapper 
      content={tooltipText}
      disabled={showText}
    >
      <Button
        ref={ref}
        variant={variant}
        size={showText ? 'default' : 'icon'}
        onClick={handleClick}
        disabled={loading}
        aria-label={tooltipText}
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
            {tooltipText}
          </span>
        )}
      </Button>
    </TooltipWrapper>
  );
});

WishlistButton.displayName = "WishlistButton";