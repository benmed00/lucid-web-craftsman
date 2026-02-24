import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Blog Loading Skeleton Component
 * Provides stable layout during blog content loading to prevent flickering
 */
export const BlogSkeleton = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Page Header Skeleton */}
      <div className="bg-beige-50 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Skeleton className="h-6 w-24 mx-auto mb-2" /> {/* Badge */}
            <Skeleton className="h-12 w-80 mx-auto mb-4" /> {/* Title */}
            <Skeleton className="h-6 w-96 mx-auto" /> {/* Description */}
          </div>
        </div>
      </div>

      {/* Featured Posts Section Skeleton */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <Skeleton className="h-8 w-48 mb-8" /> {/* Section title */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[1, 2].map((i) => (
              <Card key={i} className="overflow-hidden border-none shadow-md">
                <Skeleton className="w-full h-64" /> {/* Image skeleton */}
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-3">
                    <Skeleton className="h-4 w-20" /> {/* Date */}
                    <Skeleton className="h-4 w-24" /> {/* Author */}
                  </div>
                  <Skeleton className="h-5 w-16 mb-2" /> {/* Category badge */}
                  <Skeleton className="h-7 w-full mb-3" /> {/* Title */}
                  <Skeleton className="h-4 w-full mb-2" />{' '}
                  {/* Excerpt line 1 */}
                  <Skeleton className="h-4 w-3/4 mb-6" /> {/* Excerpt line 2 */}
                  <Skeleton className="h-10 w-32" /> {/* Button */}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Latest Articles Section Skeleton */}
      <section className="py-16 bg-stone-50">
        <div className="container mx-auto px-4">
          <Skeleton className="h-8 w-40 mb-8" /> {/* Section title */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="overflow-hidden border-none shadow-sm">
                <Skeleton className="w-full h-48" /> {/* Image skeleton */}
                <CardContent className="p-6">
                  <Skeleton className="h-3 w-16 mb-3" /> {/* Date */}
                  <Skeleton className="h-4 w-12 mb-2" /> {/* Category badge */}
                  <Skeleton className="h-6 w-full mb-3" /> {/* Title */}
                  <Skeleton className="h-3 w-full mb-2" />{' '}
                  {/* Excerpt line 1 */}
                  <Skeleton className="h-3 w-2/3 mb-6" /> {/* Excerpt line 2 */}
                  <Skeleton className="h-4 w-20" /> {/* Link */}
                </CardContent>
              </Card>
            ))}
          </div>
          {/* Newsletter Section Skeleton */}
          <div className="mt-16 bg-olive-700 rounded-lg p-8 md:p-12">
            <div className="max-w-3xl mx-auto text-center">
              <Skeleton className="h-7 w-64 mx-auto mb-3 bg-olive-600" />
              <Skeleton className="h-4 w-80 mx-auto mb-6 bg-olive-600" />
              <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <Skeleton className="flex-grow h-12 bg-olive-600" />
                <Skeleton className="h-12 w-32 bg-olive-600" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BlogSkeleton;
