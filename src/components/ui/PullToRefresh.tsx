import { ReactNode } from 'react';
import { RefreshCw, ChevronDown } from 'lucide-react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  disabled?: boolean;
  className?: string;
}

export const PullToRefresh = ({
  children,
  onRefresh,
  disabled = false,
  className = '',
}: PullToRefreshProps) => {
  const {
    containerRef,
    isRefreshing,
    isPulling,
    pullDistance,
    pullProgress,
    shouldTrigger,
  } = usePullToRefresh({ onRefresh, disabled });

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Pull to refresh indicator */}
      <div
        className="absolute top-0 left-0 right-0 z-50 flex justify-center transition-all duration-200"
        style={{
          transform: `translateY(${Math.max(-60 + pullDistance * 0.5, -60)}px)`,
          opacity: isPulling ? 1 : 0,
        }}
      >
        <div className="bg-background/95 backdrop-blur-sm rounded-full shadow-lg p-3 flex items-center justify-center min-w-[60px] min-h-[60px] border border-border">
          {isRefreshing ? (
            <RefreshCw className="h-5 w-5 text-primary animate-spin" />
          ) : (
            <ChevronDown
              className={`h-5 w-5 text-muted-foreground transition-all duration-200 ${
                shouldTrigger ? 'rotate-180 text-primary' : ''
              }`}
              style={{
                transform: `rotate(${pullProgress * 180}deg)`,
              }}
            />
          )}
        </div>
      </div>

      {/* Content with pull transform */}
      <div
        className="transition-transform duration-200"
        style={{
          transform: isPulling
            ? `translateY(${Math.min(pullDistance * 0.3, 30)}px)`
            : 'translateY(0)',
        }}
      >
        {children}
      </div>
    </div>
  );
};
