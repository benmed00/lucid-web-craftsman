/**
 * Tests for useImageLoader (cascading fallback).
 *
 * Prerequisites: mocked imageService.
 * Run: npx vitest run src/hooks/useImageLoader.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const { getOptimizedSource, getNextFallback, preloadImages } = vi.hoisted(
  () => ({
    getOptimizedSource: vi.fn(),
    getNextFallback: vi.fn(),
    preloadImages: vi.fn(),
  })
);

vi.mock('@/services/imageService', () => ({
  imageService: {
    getOptimizedSource: (...args: unknown[]) => getOptimizedSource(...args),
    getNextFallback: (...args: unknown[]) => getNextFallback(...args),
    preloadImages: (...args: unknown[]) => preloadImages(...args),
  },
}));

import { useImageLoader } from './useImageLoader';

describe('useImageLoader', () => {
  beforeEach(() => {
    getOptimizedSource.mockReset();
    getNextFallback.mockReset();
  });

  it('resolves to the optimized source on success', async () => {
    getOptimizedSource.mockResolvedValue('/cdn/optimized.webp');
    const { result } = renderHook(() =>
      useImageLoader('/original.jpg', 'default')
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.currentSrc).toBe('/cdn/optimized.webp');
    expect(result.current.hasError).toBe(false);
  });

  it('falls back to placeholder when getOptimizedSource throws', async () => {
    const consoleErr = vi.spyOn(console, 'error').mockImplementation(() => {});
    getOptimizedSource.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() =>
      useImageLoader('/missing.jpg', 'default')
    );

    await waitFor(() => expect(result.current.hasError).toBe(true));
    expect(result.current.currentSrc).toBe('/placeholder.svg');
    consoleErr.mockRestore();
  });

  it('handleError swaps to the next fallback when available', async () => {
    getOptimizedSource.mockResolvedValue('/first.webp');
    getNextFallback.mockReturnValue('/second.webp');

    const { result } = renderHook(() =>
      useImageLoader('/origin.jpg', 'default')
    );
    await waitFor(() => expect(result.current.currentSrc).toBe('/first.webp'));

    act(() => result.current.handleError());

    expect(result.current.currentSrc).toBe('/second.webp');
    expect(result.current.attemptedSources).toContain('/first.webp');
  });

  it('handleError marks the load as failed when no fallback remains', async () => {
    getOptimizedSource.mockResolvedValue('/only.webp');
    getNextFallback.mockReturnValue(null);

    const { result } = renderHook(() => useImageLoader('/origin.jpg'));
    await waitFor(() => expect(result.current.currentSrc).toBe('/only.webp'));

    act(() => result.current.handleError());

    expect(result.current.hasError).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });
});
