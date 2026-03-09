import { Loader2, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import ProductGridSkeleton from '@/components/ProductGridSkeleton';
import PageFooter from '@/components/PageFooter';

interface ProductsLoadingSkeletonProps {
  isMobile: boolean;
  isSlowLoading: boolean;
  onRetry: () => void;
}

export const ProductsLoadingSkeleton = ({
  isMobile,
  isSlowLoading,
  onRetry,
}: ProductsLoadingSkeletonProps) => {
  const { t } = useTranslation('common');

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Banner Skeleton */}
      <div className="bg-gradient-to-r from-secondary to-muted py-8 md:py-12 lg:py-16">
        <div className="container mx-auto px-4 text-center animate-pulse">
          <div className="h-8 md:h-10 lg:h-12 bg-muted-foreground/20 rounded w-80 mx-auto mb-3 md:mb-4" />
          <div className="h-5 md:h-6 bg-muted-foreground/20 rounded w-96 mx-auto max-w-2xl" />
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 md:py-8 lg:py-12 safe-area">
        {isSlowLoading && (
          <div className="mb-6 p-4 bg-muted/50 border border-border rounded-lg flex items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm font-medium">
              {t('messages.stillLoading', 'Still loading products...')}
            </span>
            <Button variant="ghost" size="sm" onClick={onRetry} className="ml-2">
              <RefreshCw className="h-4 w-4 mr-1" />
              {t('buttons.retry', 'Retry')}
            </Button>
          </div>
        )}

        {isMobile && (
          <div className="space-y-6 mb-6 animate-pulse">
            <div className="h-12 bg-muted rounded-xl" />
            <div className="h-20 bg-muted rounded-xl" />
          </div>
        )}

        <div className="mb-8 space-y-4 animate-pulse">
          <div className="flex gap-4">
            <div className="h-12 bg-muted rounded flex-1" />
            <div className="h-12 bg-muted rounded w-48" />
            <div className="h-12 bg-muted rounded w-32" />
          </div>
          <div className="flex gap-2">
            <div className="h-6 bg-muted rounded w-20" />
            <div className="h-6 bg-muted rounded w-24" />
            <div className="h-6 bg-muted rounded w-28" />
          </div>
        </div>

        <ProductGridSkeleton count={isMobile ? 8 : 12} />
      </div>

      <PageFooter />
    </div>
  );
};
