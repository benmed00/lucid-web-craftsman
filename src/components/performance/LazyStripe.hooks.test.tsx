/**
 * useLazyStripe
 *
 * Prerequisites: `@stripe/stripe-js` mocked.
 * Run: npx vitest run src/components/performance/LazyStripe.hooks.test.tsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const loadStripeMock = vi.fn().mockResolvedValue({});

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: (...args: unknown[]) => loadStripeMock(...args),
}));

import { useLazyStripe } from './LazyStripe';

beforeEach(() => {
  loadStripeMock.mockClear();
});

describe('useLazyStripe', () => {
  it('dynamic-imports stripe-js and calls loadStripe with project key', async () => {
    const { result } = renderHook(() => useLazyStripe());
    await act(async () => {
      await result.current.loadStripe();
    });
    expect(loadStripeMock).toHaveBeenCalledWith('pk_test_placeholder');
  });
});
