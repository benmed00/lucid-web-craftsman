import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load Stripe components only when needed
const LazyStripeProvider = lazy(() => 
  import('@stripe/stripe-js').then(async (module) => {
    // Only load Stripe when the component is actually needed
    const stripe = await module.loadStripe(
      (window as any).STRIPE_PUBLIC_KEY || 'pk_test_placeholder'
    );
    
    return {
      default: ({ children }: { children: React.ReactNode }) => (
        <div data-stripe-initialized="true">
          {children}
        </div>
      )
    };
  })
);

// Loading fallback for Stripe components
const StripeLoadingFallback = () => (
  <div className="space-y-4 p-4">
    <Skeleton className="h-12 w-full" />
    <Skeleton className="h-8 w-3/4" />
    <Skeleton className="h-10 w-1/2" />
  </div>
);

// Wrapper component that loads Stripe only when needed
export const LazyStripeWrapper = ({ 
  children, 
  fallback = <StripeLoadingFallback /> 
}: { 
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) => {
  return (
    <Suspense fallback={fallback}>
      <LazyStripeProvider>
        {children}
      </LazyStripeProvider>
    </Suspense>
  );
};

// Hook to dynamically load Stripe when needed
export const useLazyStripe = () => {
  const loadStripe = async () => {
    const { loadStripe: stripeLoader } = await import('@stripe/stripe-js');
    return stripeLoader((window as any).STRIPE_PUBLIC_KEY || 'pk_test_placeholder');
  };

  return { loadStripe };
};