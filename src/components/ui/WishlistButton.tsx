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

export const WishlistButton = ({ 
  productId, 
  className, 
  size = 'md',
  variant = 'ghost',
  showText = false 
}: WishlistButtonProps) => {
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
        variant={variant}
        size={showText ? 'default' : 'icon'}
        onClick={handleClick}
        disabled={loading}
        className={cn(
          'transition-all duration-200',
          !showText && sizeClasses[size],
          isFavorited && 'text-red-500 hover:text-red-600',
          !isFavorited && 'text-stone-400 hover:text-stone-600',
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
};