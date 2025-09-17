import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveGridProps {
  children: ReactNode;
  className?: string;
  cols?: {
    mobile?: 1 | 2;
    tablet?: 2 | 3 | 4;
    desktop?: 3 | 4 | 5 | 6;
  };
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  as?: 'div' | 'section' | 'ul' | 'ol';
}

const gapClasses = {
  sm: 'gap-3 sm:gap-4',
  md: 'gap-4 sm:gap-6',
  lg: 'gap-4 sm:gap-6 lg:gap-8',
  xl: 'gap-6 sm:gap-8 lg:gap-10'
};

export const ResponsiveGrid = ({ 
  children, 
  className = '', 
  cols = { mobile: 1, tablet: 2, desktop: 3 },
  gap = 'md',
  as: Component = 'div'
}: ResponsiveGridProps) => {
  const mobileColsClass = cols.mobile === 1 ? 'grid-cols-1' : 'grid-cols-2';
  const tabletColsClass = cols.tablet ? `md:grid-cols-${cols.tablet}` : '';
  const desktopColsClass = cols.desktop ? `lg:grid-cols-${cols.desktop}` : '';

  return (
    <Component 
      className={cn(
        'grid',
        mobileColsClass,
        tabletColsClass,
        desktopColsClass,
        gapClasses[gap],
        className
      )}
    >
      {children}
    </Component>
  );
};

export default ResponsiveGrid;