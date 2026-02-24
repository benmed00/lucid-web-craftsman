import { useMemo } from 'react';
import { Product } from '@/shared/interfaces/Iproduct.interface';

interface UseProductRecommendationsOptions {
  currentProduct?: Product;
  allProducts: Product[];
  recentlyViewed?: Product[];
  maxRecommendations?: number;
}

interface RecommendationScore {
  product: Product;
  score: number;
}

export const useProductRecommendations = ({
  currentProduct,
  allProducts,
  recentlyViewed = [],
  maxRecommendations = 6,
}: UseProductRecommendationsOptions) => {
  const recommendations = useMemo(() => {
    if (!allProducts.length) return [];

    const scored: RecommendationScore[] = [];

    for (const product of allProducts) {
      // Skip current product
      if (currentProduct && product.id === currentProduct.id) continue;

      let score = 0;

      // Related products (highest priority)
      if (currentProduct?.related?.includes(product.id)) {
        score += 100;
      }

      // Same category
      if (currentProduct && product.category === currentProduct.category) {
        score += 50;
      }

      // Similar price range (±30%)
      if (currentProduct) {
        const priceDiff =
          Math.abs(product.price - currentProduct.price) / currentProduct.price;
        if (priceDiff <= 0.3) {
          score += 30;
        }
      }

      // Same artisan
      if (currentProduct && product.artisan === currentProduct.artisan) {
        score += 25;
      }

      // Recently viewed category preference
      if (recentlyViewed.length > 0) {
        const viewedCategories = recentlyViewed.map((p) => p.category);
        const categoryCount = viewedCategories.filter(
          (cat) => cat === product.category
        ).length;
        score += categoryCount * 10;
      }

      // New products bonus
      if (product.new || product.is_new) {
        score += 15;
      }

      // Use product ID as a stable "random" factor for variety
      score += product.id % 5;

      if (score > 0) {
        scored.push({ product, score });
      }
    }

    // Sort by score and return top recommendations
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, maxRecommendations)
      .map((item) => item.product);
  }, [currentProduct, allProducts, recentlyViewed, maxRecommendations]);

  return recommendations;
};
