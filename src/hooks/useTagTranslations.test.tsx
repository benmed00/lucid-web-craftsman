/**
 * Tests for useTagTranslations + useTranslateTag.
 *
 * Prerequisites: mocked `@/services/tagTranslationsApi`. Each test wraps
 * the hook in a fresh QueryClient.
 * Run: npx vitest run src/hooks/useTagTranslations.test.tsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { fetchAllTagTranslations } = vi.hoisted(() => ({
  fetchAllTagTranslations: vi.fn(),
}));

vi.mock('@/services/tagTranslationsApi', () => ({
  fetchAllTagTranslations: (...a: unknown[]) => fetchAllTagTranslations(...a),
}));

import { useTagTranslations, useTranslateTag } from './useTagTranslations';

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const TRANSLATIONS = [
  {
    id: '1',
    tag_key: 'paniers',
    fr: 'Paniers',
    en: 'Baskets',
    ar: 'سلال',
    es: null,
    de: null,
    created_at: '',
    updated_at: '',
  },
  {
    id: '2',
    tag_key: 'chapeaux',
    fr: 'Chapeaux',
    en: 'Hats',
    ar: null,
    es: null,
    de: null,
    created_at: '',
    updated_at: '',
  },
];

beforeEach(() => {
  fetchAllTagTranslations.mockReset();
});

describe('useTagTranslations', () => {
  it('loads the translation table', async () => {
    fetchAllTagTranslations.mockResolvedValue(TRANSLATIONS);
    const { result } = renderHook(() => useTagTranslations(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(TRANSLATIONS);
  });
});

describe('useTranslateTag', () => {
  it('returns the localized value when available', async () => {
    fetchAllTagTranslations.mockResolvedValue(TRANSLATIONS);
    const { result } = renderHook(() => useTranslateTag(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.translations).toBeTruthy());
    expect(result.current.translateTag('paniers', 'en')).toBe('Baskets');
    expect(result.current.translateTag('paniers', 'ar')).toBe('سلال');
  });

  it('falls back to French when the requested locale has no entry', async () => {
    fetchAllTagTranslations.mockResolvedValue(TRANSLATIONS);
    const { result } = renderHook(() => useTranslateTag(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.translations).toBeTruthy());
    expect(result.current.translateTag('chapeaux', 'es')).toBe('Chapeaux');
  });

  it('returns the input tag when no translation row matches', async () => {
    fetchAllTagTranslations.mockResolvedValue(TRANSLATIONS);
    const { result } = renderHook(() => useTranslateTag(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.translations).toBeTruthy());
    expect(result.current.translateTag('unknown', 'en')).toBe('unknown');
  });

  it('returns the tag unchanged while translations are loading', () => {
    fetchAllTagTranslations.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useTranslateTag(), {
      wrapper: makeWrapper(),
    });
    expect(result.current.translateTag('paniers', 'fr')).toBe('paniers');
    expect(result.current.isLoading).toBe(true);
  });
});
