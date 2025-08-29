import { Card, CardContent } from "@/components/ui/card";

const ProductSkeleton = () => {
  return (
    <Card className="bg-white border border-stone-100 overflow-hidden group rounded-2xl shadow-lg animate-pulse">
      {/* Image Section */}
      <div className="relative">
        <div className="aspect-[4/3] w-full bg-stone-200 rounded-t-xl"></div>
        
        {/* Quick View Button Skeleton */}
        <div className="absolute top-3 right-3 z-20">
          <div className="w-10 h-10 bg-stone-300 rounded-full"></div>
        </div>
      </div>
      
      <CardContent className="p-5 md:p-6 relative">
        {/* Wishlist button skeleton */}
        <div className="absolute -top-2 right-4 z-20">
          <div className="w-10 h-10 bg-stone-300 rounded-full"></div>
        </div>

        {/* Category skeleton */}
        <div className="h-4 bg-stone-200 rounded w-16 mb-2"></div>
        
        {/* Title skeleton */}
        <div className="space-y-2 mb-4 pr-12">
          <div className="h-5 bg-stone-200 rounded w-32"></div>
          <div className="h-5 bg-stone-200 rounded w-24"></div>
        </div>
        
        <div className="flex flex-col gap-4">
          {/* Price skeleton */}
          <div className="h-6 bg-stone-200 rounded w-20"></div>
          
          {/* Button skeleton */}
          <div className="h-[52px] bg-stone-200 rounded-xl w-full"></div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductSkeleton;