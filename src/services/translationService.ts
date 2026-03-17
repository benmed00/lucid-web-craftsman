/**
 * Translation Service
 *
 * Handles fetching multilingual content from Supabase translation tables.
 * Provides locale-aware data fetching with fallback support.
 *
 * ARCHITECTURE:
 * - UI labels → react-i18next (src/i18n/)
 * - Business content (products, blog) → This service (Supabase tables)
 *
 * TIMEOUT STRATEGY:
 * HTTP-level timeouts are handled by the AbortController in supabase/client.ts (15s).
 * This service catches AbortError and other failures, returning { data: null, error }.
 */

import { supabasePublic } from '@/integrations/supabase/client';
import i18n from '@/i18n';

// Supported locales
export type SupportedLocale = 'fr' | 'en' | 'ar' | 'es' | 'de';
export const DEFAULT_LOCALE: SupportedLocale = 'fr';
export const SUPPORTED_LOCALES: SupportedLocale[] = [
  'fr',
  'en',
  'ar',
  'es',
  'de',
];

/**
 * Get current locale from i18n, with fallback to default
 */
export function getCurrentLocale(): SupportedLocale {
  const lang = i18n.language?.split('-')[0] as SupportedLocale;
  return SUPPORTED_LOCALES.includes(lang) ? lang : DEFAULT_LOCALE;
}

/**
 * Wrap a Supabase query in error handling with timing and size logging.
 * HTTP timeouts are handled by AbortController in client.ts (8s).
 */
async function safeQuery<T>(
  promise: PromiseLike<{ data: T | null; error: unknown }>,
  label: string
): Promise<{ data: T | null; error: unknown }> {
  const start = performance.now();
  console.info(`[safeQuery] ⏳ ${label} — starting…`);
  try {
    // Hard timeout at service layer so UI never waits indefinitely.
    const timeoutMs = 8000;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const timeoutResult = new Promise<{ data: T | null; error: unknown }>(
      (resolve) => {
        timeoutId = setTimeout(
          () =>
            resolve({
              data: null,
              error: new Error(
                `[safeQuery] ${label} timed out after ${timeoutMs}ms`
              ),
            }),
          timeoutMs
        );
      }
    );

    const result = await Promise.race([Promise.resolve(promise), timeoutResult]);
    if (timeoutId) clearTimeout(timeoutId);
    const elapsed = Math.round(performance.now() - start);
    const size = Array.isArray(result.data)
      ? result.data.length
      : result.data
        ? 1
        : 0;

    if (result.error) {
      console.error(
        `[safeQuery] ❌ ${label} failed (${elapsed}ms):`,
        result.error
      );
    } else {
      console.info(`[safeQuery] ✅ ${label} → ${size} rows in ${elapsed}ms`);
    }
    return result;
  } catch (err) {
    const elapsed = Math.round(performance.now() - start);
    const isAbort = err instanceof DOMException && err.name === 'AbortError';
    console.error(
      `[safeQuery] 🚨 ${label} ${isAbort ? `aborted after ${elapsed}ms (timeout)` : `threw after ${elapsed}ms`}:`,
      err
    );
    return { data: null, error: err };
  }
}

// =====================================================
// PRODUCT TRANSLATIONS
// =====================================================

export interface ProductTranslation {
  id: string;
  product_id: number;
  locale: SupportedLocale;
  name: string;
  description: string;
  short_description: string | null;
  details: string;
  care: string;
  artisan_story: string | null;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductWithTranslation {
  // Base product fields (non-translatable)
  id: number;
  price: number;
  images: string[];
  category: string;
  artisan: string;
  is_new: boolean | null;
  is_available: boolean | null;
  is_active: boolean | null;
  is_featured: boolean | null;
  stock_quantity: number | null;
  min_stock_level: number | null;
  material: string | null;
  color: string | null;
  dimensions_cm: string | null;
  weight_grams: number | null;
  rating_average: number | null;
  rating_count: number | null;
  slug: string | null;
  related_products: number[] | null;
  created_at: string;
  updated_at: string;

  // Translated fields
  name: string;
  description: string;
  short_description: string | null;
  details: string;
  care: string;
  artisan_story: string | null;
  seo_title: string | null;
  seo_description: string | null;

  // Locale info
  _locale: SupportedLocale;
  _fallbackUsed: boolean;
}

// Helper to merge a product row with an optional translation
function mergeProductTranslation(
  product: Record<string, unknown>,
  activeTranslation: Record<string, unknown> | null,
  fallbackUsed: boolean
): ProductWithTranslation {
  return {
    id: product.id as number,
    price: product.price as number,
    images: product.images as string[],
    category: product.category as string,
    artisan: product.artisan as string,
    is_new: product.is_new as boolean | null,
    is_available: product.is_available as boolean | null,
    is_active: product.is_active as boolean | null,
    is_featured: product.is_featured as boolean | null,
    stock_quantity: product.stock_quantity as number | null,
    min_stock_level: product.min_stock_level as number | null,
    material: product.material as string | null,
    color: product.color as string | null,
    dimensions_cm: product.dimensions_cm as string | null,
    weight_grams: product.weight_grams as number | null,
    rating_average: product.rating_average as number | null,
    rating_count: product.rating_count as number | null,
    slug: product.slug as string | null,
    related_products: product.related_products as number[] | null,
    created_at: product.created_at as string,
    updated_at: product.updated_at as string,

    name: (activeTranslation?.name as string) || (product.name as string),
    description:
      (activeTranslation?.description as string) ||
      (product.description as string),
    short_description:
      (activeTranslation?.short_description as string | null) ||
      (product.short_description as string | null),
    details:
      (activeTranslation?.details as string) || (product.details as string),
    care: (activeTranslation?.care as string) || (product.care as string),
    artisan_story:
      (activeTranslation?.artisan_story as string | null) ||
      (product.artisan_story as string | null),
    seo_title:
      (activeTranslation?.seo_title as string | null) ||
      (product.seo_title as string | null),
    seo_description:
      (activeTranslation?.seo_description as string | null) ||
      (product.seo_description as string | null),

    _locale:
      (activeTranslation?.locale as string as SupportedLocale) ||
      DEFAULT_LOCALE,
    _fallbackUsed: fallbackUsed || !activeTranslation,
  };
}

/**
 * Fetch a single product with translations for the specified locale
 */
export async function getProductWithTranslation(
  productId: number,
  locale: SupportedLocale = getCurrentLocale()
): Promise<ProductWithTranslation | null> {
  const startMs = performance.now();

  // First, try to get translation for requested locale
  const { data: translation } = await safeQuery(
    supabasePublic
      .from('product_translations')
      .select('*')
      .eq('product_id', productId)
      .eq('locale', locale)
      .single(),
    `product_translation(${productId},${locale})`
  );

  // If no translation found, try fallback to default locale
  let fallbackTranslation = null;
  let fallbackUsed = false;

  if (!translation && locale !== DEFAULT_LOCALE) {
    const { data: fallback } = await safeQuery(
      supabasePublic
        .from('product_translations')
        .select('*')
        .eq('product_id', productId)
        .eq('locale', DEFAULT_LOCALE)
        .single(),
      `product_translation_fallback(${productId})`
    );

    fallbackTranslation = fallback;
    fallbackUsed = true;
  }

  const activeTranslation = (translation || fallbackTranslation) as Record<
    string,
    unknown
  > | null;

  // Get base product data
  const { data: product, error: productError } = await safeQuery(
    supabasePublic.from('products').select('*').eq('id', productId).single(),
    `product(${productId})`
  );

  if (productError || !product) {
    console.error('[TranslationService] Error fetching product:', productError);
    return null;
  }

  console.info(
    `[TranslationService] getProductWithTranslation(${productId}) → ${Math.round(performance.now() - startMs)}ms`
  );

  return mergeProductTranslation(
    product as Record<string, unknown>,
    activeTranslation,
    fallbackUsed
  );
}

/**
 * Fetch all products with translations for the specified locale.
 *
 * OPTIMISATION: Uses a single Supabase query with a left-join on
 * product_translations, reducing 2–3 HTTP requests to just 1.
 * This is critical for avoiding Chrome's 6-connection-per-host limit
 * during initial page load.
 */
export async function getProductsWithTranslations(
  locale: SupportedLocale = getCurrentLocale()
): Promise<ProductWithTranslation[]> {
  console.info(
    '[TranslationService] getProductsWithTranslations CALLED, locale:',
    locale
  );
  const startMs = performance.now();

  // Single query with embedded translations via Supabase join
  const { data: products, error: productsError } = await safeQuery(
    supabasePublic
      .from('products')
      .select(
        `
        *,
        product_translations!left (
          locale,
          name,
          description,
          short_description,
          details,
          care,
          artisan_story,
          seo_title,
          seo_description
        )
      `
      )
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
    `products_with_translations(${locale})`
  );

  if (productsError || !products) {
    console.error(
      '[TranslationService] Error fetching products:',
      productsError
    );
    throw new Error(
      `Failed to fetch products: ${productsError instanceof Error ? productsError.message : String(productsError)}`
    );
  }

  const elapsed = Math.round(performance.now() - startMs);
  console.info(
    `[TranslationService] getProductsWithTranslations(${locale}) → ${(products as unknown[]).length} products in ${elapsed}ms (1 query, joined)`
  );

  // Merge products with the best matching translation
  return (products as Record<string, unknown>[]).map((product) => {
    const translations = (product.product_translations || []) as Record<
      string,
      unknown
    >[];

    // Prefer requested locale, then fall back to default locale
    const translation = translations.find((t) => t.locale === locale) || null;
    const fallback =
      locale !== DEFAULT_LOCALE
        ? translations.find((t) => t.locale === DEFAULT_LOCALE) || null
        : null;
    const activeTranslation = translation || fallback || null;

    return mergeProductTranslation(
      product,
      activeTranslation,
      !translation && !!fallback
    );
  });
}

// =====================================================
// BLOG POST TRANSLATIONS
// =====================================================

export interface BlogPostTranslation {
  id: string;
  blog_post_id: string;
  locale: SupportedLocale;
  title: string;
  excerpt: string | null;
  content: string;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlogPostWithTranslation {
  id: string;
  slug: string;
  featured_image_url: string | null;
  author_id: string | null;
  status: string | null;
  is_featured: boolean | null;
  tags: string[] | null;
  published_at: string | null;
  view_count: number | null;
  created_at: string | null;
  updated_at: string | null;

  // Translated fields
  title: string;
  excerpt: string | null;
  content: string;
  seo_title: string | null;
  seo_description: string | null;

  // Locale info
  _locale: SupportedLocale;
  _fallbackUsed: boolean;
}

// Helper to merge a blog post row with an optional translation
function mergeBlogTranslation(
  post: Record<string, unknown>,
  activeTranslation: Record<string, unknown> | null,
  fallbackUsed: boolean
): BlogPostWithTranslation {
  return {
    id: post.id as string,
    slug: post.slug as string,
    featured_image_url: post.featured_image_url as string | null,
    author_id: post.author_id as string | null,
    status: post.status as string | null,
    is_featured: post.is_featured as boolean | null,
    tags: post.tags as string[] | null,
    published_at: post.published_at as string | null,
    view_count: post.view_count as number | null,
    created_at: post.created_at as string | null,
    updated_at: post.updated_at as string | null,

    title: (activeTranslation?.title as string) || (post.title as string),
    excerpt:
      (activeTranslation?.excerpt as string | null) ||
      (post.excerpt as string | null),
    content: (activeTranslation?.content as string) || (post.content as string),
    seo_title:
      (activeTranslation?.seo_title as string | null) ||
      (post.seo_title as string | null),
    seo_description:
      (activeTranslation?.seo_description as string | null) ||
      (post.seo_description as string | null),

    _locale:
      (activeTranslation?.locale as string as SupportedLocale) ||
      DEFAULT_LOCALE,
    _fallbackUsed: fallbackUsed || !activeTranslation,
  };
}

/**
 * Fetch a single blog post with translations
 */
export async function getBlogPostWithTranslation(
  blogPostId: string,
  locale: SupportedLocale = getCurrentLocale()
): Promise<BlogPostWithTranslation | null> {
  const { data: translation } = await safeQuery(
    supabasePublic
      .from('blog_post_translations')
      .select('*')
      .eq('blog_post_id', blogPostId)
      .eq('locale', locale)
      .single(),
    `blog_translation(${blogPostId},${locale})`
  );

  let fallbackTranslation = null;
  let fallbackUsed = false;

  if (!translation && locale !== DEFAULT_LOCALE) {
    const { data: fallback } = await safeQuery(
      supabasePublic
        .from('blog_post_translations')
        .select('*')
        .eq('blog_post_id', blogPostId)
        .eq('locale', DEFAULT_LOCALE)
        .single(),
      `blog_translation_fallback(${blogPostId})`
    );

    fallbackTranslation = fallback;
    fallbackUsed = true;
  }

  const activeTranslation = (translation || fallbackTranslation) as Record<
    string,
    unknown
  > | null;

  const { data: post, error: postError } = await safeQuery(
    supabasePublic.from('blog_posts').select('*').eq('id', blogPostId).single(),
    `blog_post(${blogPostId})`
  );

  if (postError || !post) {
    console.error('[TranslationService] Error fetching blog post:', postError);
    return null;
  }

  return mergeBlogTranslation(
    post as Record<string, unknown>,
    activeTranslation,
    fallbackUsed
  );
}

/**
 * Fetch all published blog posts with translations.
 *
 * Uses a single Supabase query with left-join on blog_post_translations,
 * same optimization as getProductsWithTranslations (1 request instead of 2-3).
 */
export async function getBlogPostsWithTranslations(
  locale: SupportedLocale = getCurrentLocale()
): Promise<BlogPostWithTranslation[]> {
  const startMs = performance.now();

  const { data: posts, error: postsError } = await safeQuery(
    supabasePublic
      .from('blog_posts')
      .select(
        `
        *,
        blog_post_translations!left (
          locale,
          title,
          excerpt,
          content,
          seo_title,
          seo_description
        )
      `
      )
      .eq('status', 'published')
      .order('published_at', { ascending: false }),
    `blog_posts_with_translations(${locale})`
  );

  if (postsError || !posts) {
    console.error(
      '[TranslationService] Error fetching blog posts:',
      postsError
    );
    throw new Error(
      `Failed to fetch blog posts: ${postsError instanceof Error ? postsError.message : String(postsError)}`
    );
  }

  if ((posts as unknown[]).length === 0) {
    console.info('[TranslationService] No published blog posts found');
    return [];
  }

  const elapsed = Math.round(performance.now() - startMs);
  console.info(
    `[TranslationService] getBlogPostsWithTranslations(${locale}) → ${(posts as unknown[]).length} posts in ${elapsed}ms (1 query, joined)`
  );

  return (posts as Record<string, unknown>[]).map((post) => {
    const translations = (post.blog_post_translations || []) as Record<
      string,
      unknown
    >[];
    const translation = translations.find((t) => t.locale === locale) || null;
    const fallback =
      locale !== DEFAULT_LOCALE
        ? translations.find((t) => t.locale === DEFAULT_LOCALE) || null
        : null;
    const activeTranslation = translation || fallback || null;

    return mergeBlogTranslation(
      post,
      activeTranslation,
      !translation && !!fallback
    );
  });
}

/**
 * Fetch blog post by slug with translations
 */
export async function getBlogPostBySlugWithTranslation(
  slug: string,
  locale: SupportedLocale = getCurrentLocale()
): Promise<BlogPostWithTranslation | null> {
  const { data: post, error } = await safeQuery(
    supabasePublic
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single(),
    `blog_post_by_slug(${slug})`
  );

  if (error || !post) {
    return null;
  }

  return getBlogPostWithTranslation(
    (post as Record<string, unknown>).id as string,
    locale
  );
}
