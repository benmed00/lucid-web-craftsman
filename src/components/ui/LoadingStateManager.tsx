import { createContext, useContext, useState, useCallback, useEffect, FC, ReactNode } from 'react';

interface LoadingState {
  [key: string]: boolean;
}

interface LoadingContextType {
  loadingStates: LoadingState;
  setLoading: (key: string, loading: boolean) => void;
  isLoading: (key: string) => boolean;
  isAnyLoading: () => boolean;
  clearAll: () => void;
}

const LoadingContext = createContext<LoadingContextType | null>(null);

export const LoadingStateProvider: FC<{ children: ReactNode }> = ({ 
  children 
}) => {
  const [loadingStates, setLoadingStates] = useState<LoadingState>({});

  const setLoading = useCallback((key: string, loading: boolean) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: loading,
    }));

    // Auto-cleanup false states after delay to prevent memory leaks
    if (!loading) {
      setTimeout(() => {
        setLoadingStates(prev => {
          const newState = { ...prev };
          if (!newState[key]) {
            delete newState[key];
          }
          return newState;
        });
      }, 1000);
    }
  }, []);

  const isLoading = useCallback((key: string) => {
    return loadingStates[key] || false;
  }, [loadingStates]);

  const isAnyLoading = useCallback(() => {
    return Object.values(loadingStates).some(Boolean);
  }, [loadingStates]);

  const clearAll = useCallback(() => {
    setLoadingStates({});
  }, []);

  const contextValue = {
    loadingStates,
    setLoading,
    isLoading,
    isAnyLoading,
    clearAll,
  };

  return (
    <LoadingContext.Provider value={contextValue}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoadingState = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoadingState must be used within LoadingStateProvider');
  }
  return context;
};

// Component for managing loading with automatic cleanup
interface LoadingManagerProps {
  isLoading: boolean;
  loadingKey: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export const LoadingManager: FC<LoadingManagerProps> = ({
  isLoading,
  loadingKey,
  children,
  fallback,
}) => {
  const { setLoading } = useLoadingState();

  useEffect(() => {
    setLoading(loadingKey, isLoading);
  }, [isLoading, loadingKey, setLoading]);

  if (isLoading && fallback) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Enhanced skeleton components with reduced flickering
export const OptimizedSkeleton: FC<{
  className?: string;
  animate?: boolean;
  duration?: number;
}> = ({ 
  className = "h-4 bg-muted rounded", 
  animate = true, 
  duration = 1000 
}) => {
  return (
    <div 
      className={`${className} ${animate ? 'animate-pulse' : ''}`}
      style={animate ? { 
        animationDuration: `${duration}ms`,
        animationDelay: `${Math.random() * 200}ms` 
      } : undefined}
    />
  );
};

export const ProductCardSkeleton: FC = () => (
  <div className="bg-card rounded-lg border p-4 space-y-4">
    <OptimizedSkeleton className="h-48 bg-muted rounded-md" />
    <div className="space-y-2">
      <OptimizedSkeleton className="h-4 bg-muted rounded w-3/4" />
      <OptimizedSkeleton className="h-4 bg-muted rounded w-1/2" />
      <OptimizedSkeleton className="h-6 bg-muted rounded w-1/3" />
    </div>
  </div>
);

export const ProfileSkeleton: FC = () => (
  <div className="space-y-6">
    <div className="flex items-center space-x-4">
      <OptimizedSkeleton className="h-16 w-16 bg-muted rounded-full" />
      <div className="space-y-2">
        <OptimizedSkeleton className="h-4 bg-muted rounded w-32" />
        <OptimizedSkeleton className="h-3 bg-muted rounded w-48" />
      </div>
    </div>
    <div className="space-y-2">
      <OptimizedSkeleton className="h-4 bg-muted rounded w-full" />
      <OptimizedSkeleton className="h-4 bg-muted rounded w-2/3" />
      <OptimizedSkeleton className="h-4 bg-muted rounded w-1/3" />
    </div>
  </div>
);