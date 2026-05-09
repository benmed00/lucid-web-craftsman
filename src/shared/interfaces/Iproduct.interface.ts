/**
 * Product Interface
 *
 * IMPORTANT: This interface uses snake_case to match Supabase database schema.
 * All field names should match the database column names exactly.
 *
 * Canonical **persisted** row type is {@link ProductRow} (`src/types/domain/product.ts`).
 * This interface stays intentionally loose so mocks, translations, and fixtures do not need
 * every generated column present at compile time.
 *
 * For any legacy code using camelCase (artisanStory, new, related),
 * use the normalizeProduct() helper from productService.ts
 */
import type { ProductRow } from '@/types/domain/product';

export type { ProductRow };

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

  // Status flags (DB columns may be NULL)
  is_new?: boolean | null;
  is_available?: boolean | null;
  is_active?: boolean | null;
  is_featured?: boolean | null;

  // Stock management (DB columns may be NULL)
  stock_quantity?: number | null;
  min_stock_level?: number | null;

  // Extended content
  artisan_story?: string | null;
  short_description?: string | null;

  // Related products (DB column may be NULL)
  related_products?: number[] | null;

  // SEO fields
  slug?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;

  // Physical attributes
  material?: string | null;
  color?: string | null;
  dimensions_cm?: string | null;
  weight_grams?: number | null;

  // Rating
  rating_average?: number | null;
  rating_count?: number | null;

  // Timestamps
  created_at?: string | null;
  updated_at?: string | null;

  // Legacy aliases (deprecated - for backward compatibility only)
  /** @deprecated Use is_new instead */
  new?: boolean;
  /** @deprecated Use artisan_story instead */
  artisanStory?: string;
  /** @deprecated Use related_products instead */
  related?: number[] | null;
}

/**
 * Normalized Product type without deprecated fields
 * Use this for new code
 */
export type NormalizedProduct = Omit<
  Product,
  'new' | 'artisanStory' | 'related'
>;

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
    new: product.is_new ?? undefined,
    artisanStory: product.artisan_story ?? undefined,
    related: product.related_products ?? undefined,
  };
}

/**
 * Normalize an array of products
 */
export function normalizeProducts(products: Product[]): Product[] {
  return products.map(normalizeProduct);
}
