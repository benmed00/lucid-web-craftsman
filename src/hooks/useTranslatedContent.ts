/**
 * Custom hooks for fetching translated content
 * 
 * These hooks integrate with react-query and react-i18next
 * to provide locale-aware data fetching with caching.
 */

import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getProductWithTranslation,
  getProductsWithTranslations,
  getBlogPostWithTranslation,
  getBlogPostsWithTranslations,
  getBlogPostBySlugWithTranslation,
  ProductWithTranslation,
  BlogPostWithTranslation,
  SupportedLocale,
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
} from '@/services/translationService';

/**
 * Get current locale from i18n
 */
export function useCurrentLocale(): SupportedLocale {
  const { i18n } = useTranslation();
  const lang = i18n.language?.split('-')[0] as SupportedLocale;
  return SUPPORTED_LOCALES.includes(lang) ? lang : DEFAULT_LOCALE;
}

/**
 * Hook for fetching a single product with translations
 */
export function useProductWithTranslation(productId: number | null) {
  const locale = useCurrentLocale();
  
  return useQuery<ProductWithTranslation | null>({
    queryKey: ['product', productId, locale],
    queryFn: () => productId ? getProductWithTranslation(productId, locale) : null,
    enabled: productId !== null,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for fetching all products with translations
 */
export function useProductsWithTranslations() {
  const locale = useCurrentLocale();
  
  return useQuery<ProductWithTranslation[]>({
    queryKey: ['products', locale],
    queryFn: () => getProductsWithTranslations(locale),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for fetching a single blog post with translations
 */
export function useBlogPostWithTranslation(blogPostId: string | null) {
  const locale = useCurrentLocale();
  
  return useQuery<BlogPostWithTranslation | null>({
    queryKey: ['blogPost', blogPostId, locale],
    queryFn: () => blogPostId ? getBlogPostWithTranslation(blogPostId, locale) : null,
    enabled: blogPostId !== null,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for fetching blog post by slug with translations
 */
export function useBlogPostBySlug(slug: string | null) {
  const locale = useCurrentLocale();
  
  return useQuery<BlogPostWithTranslation | null>({
    queryKey: ['blogPost', 'slug', slug, locale],
    queryFn: () => slug ? getBlogPostBySlugWithTranslation(slug, locale) : null,
    enabled: slug !== null,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for fetching all blog posts with translations
 */
export function useBlogPostsWithTranslations() {
  const locale = useCurrentLocale();
  
  return useQuery<BlogPostWithTranslation[]>({
    queryKey: ['blogPosts', locale],
    queryFn: () => getBlogPostsWithTranslations(locale),
    staleTime: 5 * 60 * 1000,
  });
}

// Re-export types for convenience
export type { ProductWithTranslation, BlogPostWithTranslation, SupportedLocale };
export { SUPPORTED_LOCALES, DEFAULT_LOCALE };
