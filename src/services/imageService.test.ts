/**
 * imageService: crossOrigin alignment for Supabase Storage preloads (checkImage).
 *
 * Prerequisites: none. Mocks global Image.
 * Run: npx vitest run src/services/imageService.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { imageService } from './imageService';

describe('imageService.checkImage', () => {
  let lastInstance: { crossOrigin?: string; src?: string };

  beforeEach(() => {
    imageService.clearCache();
    lastInstance = {};
    vi.stubGlobal(
      'Image',
      class MockImage {
        crossOrigin: string | undefined;
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        private _src = '';
        constructor() {
          lastInstance = this;
        }
        set src(v: string) {
          this._src = v;
          queueMicrotask(() => this.onload?.());
        }
        get src() {
          return this._src;
        }
      }
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sets crossOrigin anonymous before src for Supabase storage URLs', async () => {
    const url =
      'https://proj.supabase.co/storage/v1/object/public/hero-images/x.jpg';
    const ok = await imageService.checkImage(url);
    expect(ok).toBe(true);
    expect(lastInstance.crossOrigin).toBe('anonymous');
    expect(lastInstance.src).toBe(url);
  });

  it('does not set crossOrigin for same-origin relative paths', async () => {
    const url = '/assets/images/home_page_image.webp';
    await imageService.checkImage(url);
    expect(lastInstance.crossOrigin).toBeUndefined();
    expect(lastInstance.src).toBe(url);
  });
});
