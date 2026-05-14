/**
 * useWebVitals: mounts without throwing; registers load listener when document not complete.
 *
 * Run: npx vitest run src/hooks/useWebVitals.test.ts
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWebVitals } from './useWebVitals';

describe('useWebVitals', () => {
  const originalReadyState = document.readyState;

  afterEach(() => {
    Object.defineProperty(document, 'readyState', {
      value: originalReadyState,
      configurable: true,
    });
  });

  it('eventually reads navigation timing when document is complete', async () => {
    Object.defineProperty(document, 'readyState', {
      value: 'complete',
      configurable: true,
    });
    const spy = vi.spyOn(performance, 'getEntriesByType').mockReturnValue([]);
    const { unmount } = renderHook(() => useWebVitals());
    await waitFor(
      () => {
        expect(spy).toHaveBeenCalledWith('navigation');
      },
      { timeout: 4000 }
    );
    unmount();
    spy.mockRestore();
  });

  it('registers window load when document is loading', () => {
    Object.defineProperty(document, 'readyState', {
      value: 'loading',
      configurable: true,
    });
    const add = vi.spyOn(window, 'addEventListener');
    const { unmount } = renderHook(() => useWebVitals());
    expect(add).toHaveBeenCalledWith('load', expect.any(Function));
    unmount();
    add.mockRestore();
  });
});
