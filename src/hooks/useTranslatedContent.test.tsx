/**
 * Tests for the useTranslatedContent hook family.
 *
 * Prerequisites: mocked `@/services/translationService` and `react-i18next`.
 * Each test uses a fresh QueryClientProvider.
 * Run: npx vitest run src/hooks/useTranslatedContent.test.tsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const {
  getProductWithTranslation,
  getProductsWithTranslations,
  getBlogPostWithTranslation,
  getBlogPostBySlugWithTranslation,
  getBlogPostsWithTranslations,
  useTranslationMock,
} = vi.hoisted(() => ({
  getProductWithTranslation: vi.fn(),
  getProductsWithTranslations: vi.fn(),
  getBlogPostWithTranslation: vi.fn(),
  getBlogPostBySlugWithTranslation: vi.fn(),
  getBlogPostsWithTranslations: vi.fn(),
  useTranslationMock: vi.fn(),
}));

vi.mock('@/services/translationService', () => ({
  getProductWithTranslation: (...a: unknown[]) => getProductWithTranslation(...a),
  getProductsWithTranslations: (...a: unknown[]) =>
    getProductsWithTranslations(...a),
  getBlogPostWithTranslation: (...a: unknown[]) =>
    getBlogPostWithTranslation(...a),
  getBlogPostBySlugWithTranslation: (...a: unknown[]) =>
    getBlogPostBySlugWithTranslation(...a),
  getBlogPostsWithTranslations: (...a: unknown[]) =>
    getBlogPostsWithTranslations(...a),
  SUPPORTED_LOCALES: ['fr', 'en', 'ar', 'es', 'de'] as const,
  DEFAULT_LOCALE: 'fr' as const,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => useTranslationMock(),
}));

import {
  useCurrentLocale,
  useProductWithTranslation,
  useProductsWithTranslations,
  useBlogPostWithTranslation,
  useBlogPostBySlug,
  useBlogPostsWithTranslations,
} from './useTranslatedContent';

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useTranslationMock.mockReturnValue({ i18n: { language: 'en-US' } });
});

describe('useCurrentLocale', () => {
  it('returns the language base code', () => {
    useTranslationMock.mockReturnValue({ i18n: { language: 'fr-FR' } });
    const { result } = renderHook(() => useCurrentLocale());
    expect(result.current).toBe('fr');
  });

  it('falls back to DEFAULT_LOCALE for unsupported codes', () => {
    useTranslationMock.mockReturnValue({ i18n: { language: 'zh-CN' } });
    const { result } = renderHook(() => useCurrentLocale());
    expect(result.current).toBe('fr');
  });
});

describe('useProductWithTranslation', () => {
  it('skips fetching when productId is null', () => {
    const { result } = renderHook(() => useProductWithTranslation(null), {
      wrapper: makeWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
    expect(getProductWithTranslation).not.toHaveBeenCalled();
  });

  it('calls the service with productId + current locale', async () => {
    getProductWithTranslation.mockResolvedValue({ id: 1 });
    const { result } = renderHook(() => useProductWithTranslation(1), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getProductWithTranslation).toHaveBeenCalledWith(1, 'en');
  });
});

describe('useProductsWithTranslations', () => {
  it('fetches the full list for the current locale', async () => {
    getProductsWithTranslations.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    const { result } = renderHook(() => useProductsWithTranslations(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getProductsWithTranslations).toHaveBeenCalledWith('en');
    expect(result.current.data).toHaveLength(2);
  });
});

describe('useBlogPostWithTranslation + useBlogPostBySlug', () => {
  it('skips fetching when blog post id is null', () => {
    const { result } = renderHook(() => useBlogPostWithTranslation(null), {
      wrapper: makeWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('fetches by id when provided', async () => {
    getBlogPostWithTranslation.mockResolvedValue({ id: 'b1' });
    const { result } = renderHook(() => useBlogPostWithTranslation('b1'), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getBlogPostWithTranslation).toHaveBeenCalledWith('b1', 'en');
  });

  it('fetches by slug when slug is provided', async () => {
    getBlogPostBySlugWithTranslation.mockResolvedValue({ id: 'b1' });
    const { result } = renderHook(() => useBlogPostBySlug('my-post'), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getBlogPostBySlugWithTranslation).toHaveBeenCalledWith(
      'my-post',
      'en'
    );
  });
});

describe('useBlogPostsWithTranslations', () => {
  it('fetches the full list for the current locale', async () => {
    getBlogPostsWithTranslations.mockResolvedValue([{ id: 'b1' }]);
    const { result } = renderHook(() => useBlogPostsWithTranslations(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getBlogPostsWithTranslations).toHaveBeenCalledWith('en');
  });
});
