/**
 * useRoutePreloading
 *
 * Run: npx vitest run src/components/performance/CodeSplittingWrapper.hooks.test.tsx
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRoutePreloading } from './CodeSplittingWrapper';

describe('useRoutePreloading', () => {
  it('exposes preloadRoute and accepts known route keys without throwing', async () => {
    const { result } = renderHook(() => useRoutePreloading());
    expect(typeof result.current.preloadRoute).toBe('function');

    await act(async () => {
      result.current.preloadRoute('products');
      result.current.preloadRoute('checkout');
      result.current.preloadRoute('unknown-route');
    });
  });
});
