/**
 * Custom hooks for fetching translated content
 *
 * These hooks integrate with react-query and react-i18next
 * to provide locale-aware data fetching with caching.
 */
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
    queryFn: () =>
      productId ? getProductWithTranslation(productId, locale) : null,
    enabled: productId !== null,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for fetching all products with translations.
 *
 * RESILIENCE CONFIG:
 * - retry: 1 (one retry after failure)
 * - retryDelay: 2s flat
 * - refetchOnMount: true ensures fresh data on navigation
 * - gcTime: 10min keeps cache warm for back-navigation
 */
export function useProductsWithTranslations() {
  const locale = useCurrentLocale();
  const queryClient = useQueryClient();

  const query = useQuery<ProductWithTranslation[]>({
    queryKey: ['products', locale],
    queryFn: () => getProductsWithTranslations(locale),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 1,
    retryDelay: 2000,
  });

  // Log state transitions for debugging
  useEffect(() => {
    const status = query.status;
    const fetchStatus = query.fetchStatus;
    const dataLen = query.data?.length ?? 0;
    console.info(
      `[useProductsWithTranslations] status=${status} fetchStatus=${fetchStatus} data=${dataLen} error=${query.error ? String(query.error) : 'none'}`
    );
  }, [query.status, query.fetchStatus, query.data?.length, query.error]);

  // Warm individual product cache entries from list data
  useEffect(() => {
    if (query.data) {
      query.data.forEach((product) => {
        queryClient.setQueryData(['product', product.id, locale], product);
      });
    }
  }, [query.data, locale, queryClient]);

  return query;
}

/**
 * Hook for fetching a single blog post with translations
 */
export function useBlogPostWithTranslation(blogPostId: string | null) {
  const locale = useCurrentLocale();

  return useQuery<BlogPostWithTranslation | null>({
    queryKey: ['blogPost', blogPostId, locale],
    queryFn: () =>
      blogPostId ? getBlogPostWithTranslation(blogPostId, locale) : null,
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
    queryFn: () =>
      slug ? getBlogPostBySlugWithTranslation(slug, locale) : null,
    enabled: slug !== null,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for fetching all blog posts with translations.
 * Same resilience config as products.
 */
export function useBlogPostsWithTranslations() {
  const locale = useCurrentLocale();

  const query = useQuery<BlogPostWithTranslation[]>({
    queryKey: ['blogPosts', locale],
    queryFn: () => {
      console.info(`[useBlogPostsWithTranslations] 🔄 queryFn firing for locale=${locale}`);
      return getBlogPostsWithTranslations(locale);
    },
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 1,
    retryDelay: 2000,
  });

  // Log state transitions for debugging
  useEffect(() => {
    console.info(
      `[useBlogPostsWithTranslations] status=${query.status} fetchStatus=${query.fetchStatus} data=${query.data?.length ?? 0} error=${query.error ? String(query.error) : 'none'}`
    );
  }, [query.status, query.fetchStatus, query.data?.length, query.error]);

  return query;
}

// Re-export types for convenience
export type {
  ProductWithTranslation,
  BlogPostWithTranslation,
  SupportedLocale,
};
export { SUPPORTED_LOCALES, DEFAULT_LOCALE };
