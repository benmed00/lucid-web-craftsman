/**
 * Translation Service
 * 
 * Handles fetching multilingual content from Supabase translation tables.
 * Provides locale-aware data fetching with fallback support.
 * 
 * ARCHITECTURE:
 * - UI labels → react-i18next (src/i18n/)
 * - Business content (products, blog) → This service (Supabase tables)
 */

import { supabase } from '@/integrations/supabase/client';
import i18n from '@/i18n';

// Supported locales
export type SupportedLocale = 'fr' | 'en' | 'ar' | 'es' | 'de';
export const DEFAULT_LOCALE: SupportedLocale = 'fr';
export const SUPPORTED_LOCALES: SupportedLocale[] = ['fr', 'en', 'ar', 'es', 'de'];

/**
 * Get current locale from i18n, with fallback to default
 */
export function getCurrentLocale(): SupportedLocale {
  const lang = i18n.language?.split('-')[0] as SupportedLocale;
  return SUPPORTED_LOCALES.includes(lang) ? lang : DEFAULT_LOCALE;
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

/**
 * Fetch a single product with translations for the specified locale
 */
export async function getProductWithTranslation(
  productId: number,
  locale: SupportedLocale = getCurrentLocale()
): Promise<ProductWithTranslation | null> {
  // First, try to get translation for requested locale
  const { data: translation, error: translationError } = await supabase
    .from('product_translations')
    .select('*')
    .eq('product_id', productId)
    .eq('locale', locale)
    .single();

  // If no translation found, try fallback to default locale
  let fallbackTranslation = null;
  let fallbackUsed = false;
  
  if (!translation && locale !== DEFAULT_LOCALE) {
    const { data: fallback } = await supabase
      .from('product_translations')
      .select('*')
      .eq('product_id', productId)
      .eq('locale', DEFAULT_LOCALE)
      .single();
    
    fallbackTranslation = fallback;
    fallbackUsed = true;
  }

  const activeTranslation = translation || fallbackTranslation;

  // Get base product data
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();

  if (productError || !product) {
    console.error('Error fetching product:', productError);
    return null;
  }

  // Merge product with translation
  return {
    // Base fields
    id: product.id,
    price: product.price,
    images: product.images,
    category: product.category,
    artisan: product.artisan,
    is_new: product.is_new,
    is_available: product.is_available,
    is_active: product.is_active,
    is_featured: product.is_featured,
    stock_quantity: product.stock_quantity,
    min_stock_level: product.min_stock_level,
    material: product.material,
    color: product.color,
    dimensions_cm: product.dimensions_cm,
    weight_grams: product.weight_grams,
    rating_average: product.rating_average,
    rating_count: product.rating_count,
    slug: product.slug,
    related_products: product.related_products,
    created_at: product.created_at,
    updated_at: product.updated_at,
    
    // Translated fields (from translation or fallback to base product)
    name: activeTranslation?.name || product.name,
    description: activeTranslation?.description || product.description,
    short_description: activeTranslation?.short_description || product.short_description,
    details: activeTranslation?.details || product.details,
    care: activeTranslation?.care || product.care,
    artisan_story: activeTranslation?.artisan_story || product.artisan_story,
    seo_title: activeTranslation?.seo_title || product.seo_title,
    seo_description: activeTranslation?.seo_description || product.seo_description,
    
    // Locale metadata
    _locale: activeTranslation?.locale as SupportedLocale || DEFAULT_LOCALE,
    _fallbackUsed: fallbackUsed || !activeTranslation,
  };
}

/**
 * Fetch all products with translations for the specified locale
 */
export async function getProductsWithTranslations(
  locale: SupportedLocale = getCurrentLocale()
): Promise<ProductWithTranslation[]> {
  // Get all products
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (productsError || !products) {
    console.error('Error fetching products:', productsError);
    return [];
  }

  // Get all translations for requested locale
  const productIds = products.map(p => p.id);
  const { data: translations } = await supabase
    .from('product_translations')
    .select('*')
    .in('product_id', productIds)
    .eq('locale', locale);

  // Get fallback translations if needed
  const { data: fallbackTranslations } = await supabase
    .from('product_translations')
    .select('*')
    .in('product_id', productIds)
    .eq('locale', DEFAULT_LOCALE);

  // Create lookup maps
  const translationMap = new Map(translations?.map(t => [t.product_id, t]) || []);
  const fallbackMap = new Map(fallbackTranslations?.map(t => [t.product_id, t]) || []);

  // Merge products with translations
  return products.map(product => {
    const translation = translationMap.get(product.id);
    const fallback = fallbackMap.get(product.id);
    const activeTranslation = translation || fallback;
    
    return {
      id: product.id,
      price: product.price,
      images: product.images,
      category: product.category,
      artisan: product.artisan,
      is_new: product.is_new,
      is_available: product.is_available,
      is_active: product.is_active,
      is_featured: product.is_featured,
      stock_quantity: product.stock_quantity,
      min_stock_level: product.min_stock_level,
      material: product.material,
      color: product.color,
      dimensions_cm: product.dimensions_cm,
      weight_grams: product.weight_grams,
      rating_average: product.rating_average,
      rating_count: product.rating_count,
      slug: product.slug,
      related_products: product.related_products,
      created_at: product.created_at,
      updated_at: product.updated_at,
      
      name: activeTranslation?.name || product.name,
      description: activeTranslation?.description || product.description,
      short_description: activeTranslation?.short_description || product.short_description,
      details: activeTranslation?.details || product.details,
      care: activeTranslation?.care || product.care,
      artisan_story: activeTranslation?.artisan_story || product.artisan_story,
      seo_title: activeTranslation?.seo_title || product.seo_title,
      seo_description: activeTranslation?.seo_description || product.seo_description,
      
      _locale: (activeTranslation?.locale as SupportedLocale) || DEFAULT_LOCALE,
      _fallbackUsed: !translation && !!fallback,
    };
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
  // Base blog post fields (non-translatable)
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

/**
 * Fetch a single blog post with translations
 */
export async function getBlogPostWithTranslation(
  blogPostId: string,
  locale: SupportedLocale = getCurrentLocale()
): Promise<BlogPostWithTranslation | null> {
  // Get translation for requested locale
  const { data: translation } = await supabase
    .from('blog_post_translations')
    .select('*')
    .eq('blog_post_id', blogPostId)
    .eq('locale', locale)
    .single();

  // Fallback to default locale if needed
  let fallbackTranslation = null;
  let fallbackUsed = false;
  
  if (!translation && locale !== DEFAULT_LOCALE) {
    const { data: fallback } = await supabase
      .from('blog_post_translations')
      .select('*')
      .eq('blog_post_id', blogPostId)
      .eq('locale', DEFAULT_LOCALE)
      .single();
    
    fallbackTranslation = fallback;
    fallbackUsed = true;
  }

  const activeTranslation = translation || fallbackTranslation;

  // Get base blog post
  const { data: post, error: postError } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', blogPostId)
    .single();

  if (postError || !post) {
    console.error('Error fetching blog post:', postError);
    return null;
  }

  return {
    id: post.id,
    slug: post.slug,
    featured_image_url: post.featured_image_url,
    author_id: post.author_id,
    status: post.status,
    is_featured: post.is_featured,
    tags: post.tags,
    published_at: post.published_at,
    view_count: post.view_count,
    created_at: post.created_at,
    updated_at: post.updated_at,
    
    title: activeTranslation?.title || post.title,
    excerpt: activeTranslation?.excerpt || post.excerpt,
    content: activeTranslation?.content || post.content,
    seo_title: activeTranslation?.seo_title || post.seo_title,
    seo_description: activeTranslation?.seo_description || post.seo_description,
    
    _locale: (activeTranslation?.locale as SupportedLocale) || DEFAULT_LOCALE,
    _fallbackUsed: fallbackUsed || !activeTranslation,
  };
}

/**
 * Fetch all published blog posts with translations
 */
export async function getBlogPostsWithTranslations(
  locale: SupportedLocale = getCurrentLocale()
): Promise<BlogPostWithTranslation[]> {
  // Get all published posts
  const { data: posts, error: postsError } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (postsError || !posts) {
    console.error('Error fetching blog posts:', postsError);
    return [];
  }

  // Get translations for requested locale
  const postIds = posts.map(p => p.id);
  const { data: translations } = await supabase
    .from('blog_post_translations')
    .select('*')
    .in('blog_post_id', postIds)
    .eq('locale', locale);

  // Get fallback translations
  const { data: fallbackTranslations } = await supabase
    .from('blog_post_translations')
    .select('*')
    .in('blog_post_id', postIds)
    .eq('locale', DEFAULT_LOCALE);

  // Create lookup maps
  const translationMap = new Map(translations?.map(t => [t.blog_post_id, t]) || []);
  const fallbackMap = new Map(fallbackTranslations?.map(t => [t.blog_post_id, t]) || []);

  return posts.map(post => {
    const translation = translationMap.get(post.id);
    const fallback = fallbackMap.get(post.id);
    const activeTranslation = translation || fallback;

    return {
      id: post.id,
      slug: post.slug,
      featured_image_url: post.featured_image_url,
      author_id: post.author_id,
      status: post.status,
      is_featured: post.is_featured,
      tags: post.tags,
      published_at: post.published_at,
      view_count: post.view_count,
      created_at: post.created_at,
      updated_at: post.updated_at,
      
      title: activeTranslation?.title || post.title,
      excerpt: activeTranslation?.excerpt || post.excerpt,
      content: activeTranslation?.content || post.content,
      seo_title: activeTranslation?.seo_title || post.seo_title,
      seo_description: activeTranslation?.seo_description || post.seo_description,
      
      _locale: (activeTranslation?.locale as SupportedLocale) || DEFAULT_LOCALE,
      _fallbackUsed: !translation && !!fallback,
    };
  });
}

/**
 * Fetch blog post by slug with translations
 */
export async function getBlogPostBySlugWithTranslation(
  slug: string,
  locale: SupportedLocale = getCurrentLocale()
): Promise<BlogPostWithTranslation | null> {
  // Get base post by slug
  const { data: post, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error || !post) {
    return null;
  }

  return getBlogPostWithTranslation(post.id, locale);
}
