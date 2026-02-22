import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MobileOptimizedProps {
  children: ReactNode;
  className?: string;
  touchOptimized?: boolean;
  safeArea?: boolean;
}

export const MobileOptimized = ({
  children,
  className = '',
  touchOptimized = true,
  safeArea = false,
}: MobileOptimizedProps) => {
  return (
    <div
      className={cn(
        // Base responsive classes
        'w-full',
        // Touch optimization
        touchOptimized && 'touch-manipulation',
        // Safe area handling for devices with notches
        safeArea && 'safe-area-inset-top safe-area-inset-bottom',
        className
      )}
    >
      {children}
    </div>
  );
};

interface TouchTargetProps {
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  as?: 'button' | 'a' | 'div';
}

const touchSizes = {
  sm: 'min-h-[44px] min-w-[44px]',
  md: 'min-h-[48px] min-w-[48px]',
  lg: 'min-h-[56px] min-w-[56px]',
};

export const TouchTarget = ({
  children,
  className = '',
  size = 'md',
  as: Component = 'div',
}: TouchTargetProps) => {
  return (
    <Component
      className={cn(
        'touch-manipulation flex items-center justify-center',
        touchSizes[size],
        className
      )}
    >
      {children}
    </Component>
  );
};

export default MobileOptimized;
