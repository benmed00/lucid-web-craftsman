import ProductSkeleton from "./ProductSkeleton";

interface ProductGridSkeletonProps {
  count?: number;
  className?: string;
}

const ProductGridSkeleton = ({ count = 12, className = "" }: ProductGridSkeletonProps) => {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i}
          style={{ 
            animationDelay: `${Math.min(i * 50, 400)}ms`,
            animationFillMode: 'both'
          }}
        >
          <ProductSkeleton />
        </div>
      ))}
    </div>
  );
};

export default ProductGridSkeleton;