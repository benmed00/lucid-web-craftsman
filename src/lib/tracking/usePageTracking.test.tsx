/**
 * Tests for usePageTracking (calls trackPageView() on each pathname change).
 *
 * Prerequisites: mocked `./pixels.trackPageView`; MemoryRouter for useLocation.
 * Run: npx vitest run src/lib/tracking/usePageTracking.test.tsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import React, { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';

const { trackPageView } = vi.hoisted(() => ({
  trackPageView: vi.fn(),
}));

vi.mock('./pixels', () => ({
  trackPageView: (...a: unknown[]) => trackPageView(...a),
}));

import { usePageTracking } from './usePageTracking';

function makeWrapper(initialEntries: string[] = ['/']) {
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
  );
}

beforeEach(() => {
  trackPageView.mockReset();
});

describe('usePageTracking', () => {
  it('calls trackPageView once on mount', () => {
    renderHook(() => usePageTracking(), { wrapper: makeWrapper(['/']) });
    expect(trackPageView).toHaveBeenCalledTimes(1);
  });

  it('does not re-fire when the hook re-renders with the same pathname', () => {
    const { rerender } = renderHook(() => usePageTracking(), {
      wrapper: makeWrapper(['/']),
    });
    rerender();
    rerender();
    expect(trackPageView).toHaveBeenCalledTimes(1);
  });
});
