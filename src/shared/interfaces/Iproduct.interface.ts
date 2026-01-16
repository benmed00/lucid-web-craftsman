/**
 * Product Interface
 * 
 * IMPORTANT: This interface uses snake_case to match Supabase database schema.
 * All field names should match the database column names exactly.
 * 
 * For any legacy code using camelCase (artisanStory, new, related),
 * use the normalizeProduct() helper from productService.ts
 */
export interface Product {
  // Core fields (required)
  id: number;
  name: string;
  price: number;
  images: string[];
  category: string;
  description: string;
  details: string;
  care: string;
  artisan: string;

  // Status flags
  is_new?: boolean;
  is_available?: boolean;
  is_active?: boolean;
  is_featured?: boolean;

  // Stock management
  stock_quantity?: number;
  min_stock_level?: number;

  // Extended content
  artisan_story?: string;
  short_description?: string;

  // Related products
  related_products?: number[];

  // SEO fields
  slug?: string;
  seo_title?: string;
  seo_description?: string;

  // Physical attributes
  material?: string;
  color?: string;
  dimensions_cm?: string;
  weight_grams?: number;

  // Rating
  rating_average?: number;
  rating_count?: number;

  // Timestamps
  created_at?: string;
  updated_at?: string;

  // Legacy aliases (deprecated - for backward compatibility only)
  /** @deprecated Use is_new instead */
  new?: boolean;
  /** @deprecated Use artisan_story instead */
  artisanStory?: string;
  /** @deprecated Use related_products instead */
  related?: number[];
}

/**
 * Normalized Product type without deprecated fields
 * Use this for new code
 */
export type NormalizedProduct = Omit<Product, 'new' | 'artisanStory' | 'related'>;

/**
 * Helper to check if product is new
 */
export function isProductNew(product: Product): boolean {
  return product.is_new === true || product.new === true;
}

/**
 * Helper to get artisan story
 */
export function getArtisanStory(product: Product): string | undefined {
  return product.artisan_story || product.artisanStory;
}

/**
 * Helper to get related products
 */
export function getRelatedProducts(product: Product): number[] {
  return product.related_products || product.related || [];
}

/**
 * Normalize a product from database format
 * This ensures legacy fields are populated for backward compatibility
 */
export function normalizeProduct(product: Product): Product {
  return {
    ...product,
    // Populate legacy fields from database fields
    new: product.is_new,
    artisanStory: product.artisan_story,
    related: product.related_products,
  };
}

/**
 * Normalize an array of products
 */
export function normalizeProducts(products: Product[]): Product[] {
  return products.map(normalizeProduct);
}
