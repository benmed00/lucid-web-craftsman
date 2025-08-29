import React, { Suspense, lazy } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

interface CodeSplittingWrapperProps {
  children: React.ReactNode;
  fallback?: React.ComponentType;
  errorFallback?: React.ComponentType<{ error: Error; resetErrorBoundary: () => void }>;
}

// Default loading component
const DefaultLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-olive-700"></div>
  </div>
);

// Default error component
const DefaultErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => (
  <div className="text-center p-8 bg-red-50 border border-red-200 rounded-lg">
    <h2 className="text-lg font-semibold text-red-800 mb-2">Une erreur s'est produite</h2>
    <p className="text-red-600 mb-4">{error.message}</p>
    <button 
      onClick={resetErrorBoundary}
      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
    >
      Réessayer
    </button>
  </div>
);

// Lazy loaded components with better performance
export const LazyProductDetail = lazy(() => 
  import('@/pages/ProductDetail').then(module => ({
    default: module.default
  }))
);

export const LazyProducts = lazy(() => 
  import('@/pages/Products').then(module => ({
    default: module.default
  }))
);

export const LazyBlog = lazy(() => 
  import('@/pages/Blog').then(module => ({
    default: module.default
  }))
);

export const LazyBlogPost = lazy(() => 
  import('@/pages/BlogPost').then(module => ({
    default: module.default
  }))
);

export const LazyCart = lazy(() => 
  import('@/pages/Cart').then(module => ({
    default: module.default
  }))
);

export const LazyCheckout = lazy(() => 
  import('@/pages/Checkout').then(module => ({
    default: module.default
  }))
);

export const LazyProfile = lazy(() => 
  import('@/pages/Profile').then(module => ({
    default: module.default
  }))
);

export const LazyAdminDashboard = lazy(() => 
  import('@/pages/admin/AdminDashboard').then(module => ({
    default: module.default
  }))
);

export const LazyAdminProducts = lazy(() => 
  import('@/pages/admin/AdminProducts').then(module => ({
    default: module.default
  }))
);

export const LazyAdminOrders = lazy(() => 
  import('@/pages/admin/AdminOrders').then(module => ({
    default: module.default
  }))
);

// HOC for wrapping components with code splitting
const CodeSplittingWrapper: React.FC<CodeSplittingWrapperProps> = ({ 
  children, 
  fallback: LoadingFallback = DefaultLoadingFallback,
  errorFallback: ErrorFallback = DefaultErrorFallback
}) => {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        // Silent error handling for production
        // You could send this to an error reporting service
      }}
    >
      <Suspense fallback={<LoadingFallback />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};

// HOC for creating lazy components with better error handling
export const createLazyComponent = <T extends Record<string, any>>(
  importFn: () => Promise<{ default: React.ComponentType<T> }>,
  componentName: string = 'Component'
) => {
  return lazy(async () => {
    try {
      const module = await importFn();
      return { default: module.default };
    } catch (error) {
      // Silent error handling for production
      
      // Return a fallback component
      return {
        default: (props: T) => (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-amber-800">
              Impossible de charger le composant {componentName}. 
              <button 
                onClick={() => window.location.reload()} 
                className="ml-2 underline hover:no-underline"
              >
                Actualiser la page
              </button>
            </p>
          </div>
        )
      };
    }
  });
};

// Preload component function for better UX
export const preloadComponent = (importFn: () => Promise<any>) => {
  // Start loading the component
  const componentPromise = importFn();
  
  // Return a function to wait for the component
  return () => componentPromise;
};

// Route-based code splitting with preloading
export const useRoutePreloading = () => {
  const preloadRoute = (routeName: string) => {
    switch (routeName) {
      case 'products':
        preloadComponent(() => import('@/pages/Products'));
        break;
      case 'product-detail':
        preloadComponent(() => import('@/pages/ProductDetail'));
        break;
      case 'blog':
        preloadComponent(() => import('@/pages/Blog'));
        break;
      case 'cart':
        preloadComponent(() => import('@/pages/Cart'));
        break;
      case 'checkout':
        preloadComponent(() => import('@/pages/Checkout'));
        break;
      default:
        // Component not found - handled silently
    }
  };

  return { preloadRoute };
};

export default CodeSplittingWrapper;