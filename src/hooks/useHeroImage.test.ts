/**
 * Tests for useHeroImage (deferred Supabase refresh + localStorage cache).
 *
 * Prerequisites: mocked heroImageService; fake timers for the 3 s defer.
 * Run: npx vitest run src/hooks/useHeroImage.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { getFn, saveFn, updateFn, resetFn, uploadFn } = vi.hoisted(() => ({
  getFn: vi.fn(),
  saveFn: vi.fn(),
  updateFn: vi.fn(),
  resetFn: vi.fn(),
  uploadFn: vi.fn(),
}));

vi.mock('@/services/heroImageService', () => ({
  heroImageService: {
    get: (...a: unknown[]) => getFn(...a),
    save: (...a: unknown[]) => saveFn(...a),
    update: (...a: unknown[]) => updateFn(...a),
    reset: (...a: unknown[]) => resetFn(...a),
    uploadImage: (...a: unknown[]) => uploadFn(...a),
  },
  HeroImageData: {},
}));

import { useHeroImage } from './useHeroImage';

const CACHE_KEY = 'rif_hero_image_cache';

describe('useHeroImage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    getFn.mockReset();
    saveFn.mockReset();
    updateFn.mockReset();
    resetFn.mockReset();
    uploadFn.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the default hero image when storage is empty', () => {
    getFn.mockResolvedValue({
      imageUrl: '/cdn/new.webp',
      altText: 'alt',
      title: 'New',
      subtitle: 'sub',
    });

    const { result } = renderHook(() => useHeroImage());
    expect(result.current.heroImageData.imageUrl).toBe(
      '/assets/images/home_page_image.webp'
    );
  });

  it('hydrates from localStorage cache when available', () => {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        imageUrl: '/cached.webp',
        altText: 'cached',
        title: 'Cached',
        subtitle: '',
      })
    );

    const { result } = renderHook(() => useHeroImage());
    expect(result.current.heroImageData.imageUrl).toBe('/cached.webp');
  });

  it('refreshes from Supabase after 3 s when imageUrl differs', async () => {
    const fresh = {
      imageUrl: '/cdn/fresh.webp',
      altText: 'alt',
      title: 'Fresh',
      subtitle: 'sub',
    };
    getFn.mockResolvedValue(fresh);

    const { result } = renderHook(() => useHeroImage());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500);
    });

    expect(result.current.heroImageData.imageUrl).toBe('/cdn/fresh.webp');
    expect(JSON.parse(localStorage.getItem(CACHE_KEY)!)).toEqual(fresh);
  });

  it('keeps the cached image when the fetched url matches it', async () => {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        imageUrl: '/same.webp',
        altText: 'a',
        title: 't',
        subtitle: '',
      })
    );
    getFn.mockResolvedValue({
      imageUrl: '/same.webp',
      altText: 'a',
      title: 't',
      subtitle: '',
    });

    const { result } = renderHook(() => useHeroImage());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500);
    });
    expect(result.current.heroImageData.imageUrl).toBe('/same.webp');
  });

  it('updateHeroImage(persistedRow with id) calls update, not save', async () => {
    const fresh = {
      id: '1',
      imageUrl: '/u.webp',
      altText: 'a',
      title: 't',
      subtitle: '',
    };
    updateFn.mockResolvedValue(fresh);
    getFn.mockResolvedValue({
      imageUrl: '/default.webp',
      altText: '',
      title: '',
      subtitle: '',
    });

    const { result } = renderHook(() => useHeroImage());
    await act(async () => {
      await result.current.updateHeroImage(fresh);
    });

    expect(updateFn).toHaveBeenCalledWith('1', fresh);
    expect(saveFn).not.toHaveBeenCalled();
    expect(result.current.heroImageData.imageUrl).toBe('/u.webp');
  });

  it('resetHeroImage restores defaults and clears cache', async () => {
    localStorage.setItem(CACHE_KEY, '{"imageUrl":"/x.webp","title":"x"}');
    resetFn.mockResolvedValue(undefined);
    getFn.mockResolvedValue({
      imageUrl: '/x.webp',
      altText: '',
      title: 'x',
      subtitle: '',
    });

    const { result } = renderHook(() => useHeroImage());
    await act(async () => {
      await result.current.resetHeroImage();
    });

    expect(result.current.heroImageData.imageUrl).toBe(
      '/assets/images/home_page_image.webp'
    );
    expect(localStorage.getItem(CACHE_KEY)).toBeNull();
  });
});
