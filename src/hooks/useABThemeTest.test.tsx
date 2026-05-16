/**
 * Tests for useABThemeTest (sticky variant assignment + theme apply).
 *
 * Prerequisites: mocked supabase client + `uiStyleStore.useUIStyleStore`.
 * Run: npx vitest run src/hooks/useABThemeTest.test.tsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AB_SESSION_KEY } from '@/lib/abThemeConstants';

const { maybeSingleFn, rpcFn, setUIStyle } = vi.hoisted(() => ({
  maybeSingleFn: vi.fn(),
  rpcFn: vi.fn(),
  setUIStyle: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          limit: () => ({
            maybeSingle: maybeSingleFn,
          }),
        }),
      }),
    }),
    rpc: (...a: unknown[]) => {
      rpcFn(...a);
      return Promise.resolve({ data: null, error: null });
    },
  },
}));

vi.mock('@/stores/uiStyleStore', () => ({
  useUIStyleStore: (
    selector: (s: { setUIStyle: typeof setUIStyle }) => unknown
  ) => selector({ setUIStyle }),
}));

import { useABThemeTest } from './useABThemeTest';

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
  sessionStorage.clear();
});

describe('useABThemeTest', () => {
  it('does nothing when there is no active test', async () => {
    maybeSingleFn.mockResolvedValue({ data: null, error: null });

    renderHook(() => useABThemeTest(), { wrapper: makeWrapper() });
    await waitFor(() => expect(maybeSingleFn).toHaveBeenCalled());
    expect(setUIStyle).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(AB_SESSION_KEY)).toBeNull();
  });

  it('reuses a sticky variant from sessionStorage', async () => {
    sessionStorage.setItem(AB_SESSION_KEY, 'b');
    maybeSingleFn.mockResolvedValue({
      data: {
        id: 't1',
        is_active: true,
        variant_a: 'legacy',
        variant_b: 'modern',
        split_percentage: 50,
      },
      error: null,
    });

    renderHook(() => useABThemeTest(), { wrapper: makeWrapper() });
    await waitFor(() => expect(setUIStyle).toHaveBeenCalled());
    expect(setUIStyle).toHaveBeenCalledWith('modern');
    expect(rpcFn).toHaveBeenCalledWith(
      'increment_ab_counter',
      expect.objectContaining({
        test_id: 't1',
        variant: 'b',
        counter_type: 'view',
      })
    );
  });

  it('assigns variant a when split_percentage forces it deterministically', async () => {
    // Math.random < 100 → always variant 'a' when split=100
    maybeSingleFn.mockResolvedValue({
      data: {
        id: 't2',
        is_active: true,
        variant_a: 'legacy',
        variant_b: 'modern',
        split_percentage: 100,
      },
      error: null,
    });

    renderHook(() => useABThemeTest(), { wrapper: makeWrapper() });
    await waitFor(() => expect(setUIStyle).toHaveBeenCalled());
    expect(setUIStyle).toHaveBeenCalledWith('legacy');
    expect(sessionStorage.getItem(AB_SESSION_KEY)).toBe('a');
  });
});
