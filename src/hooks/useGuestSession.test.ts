/**
 * useGuestSession: server-signed guest token vs local fallback.
 *
 * Prerequisites: mocked Supabase client; jsdom localStorage.
 * Run: npx vitest run src/hooks/useGuestSession.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  safeRemoveItem,
  safeSetItem,
  safeGetItem,
} from '@/lib/storage/safeStorage';
import type { GuestSession } from './useGuestSession';

const GUEST_SESSION_KEY = 'guest_session';

const { rpcMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

import { useGuestSession } from './useGuestSession';

describe('useGuestSession', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    safeRemoveItem(GUEST_SESSION_KEY, { storage: 'localStorage' });
  });

  afterEach(() => {
    safeRemoveItem(GUEST_SESSION_KEY, { storage: 'localStorage' });
  });

  it('uses guest_id and signature when create_guest_token succeeds', async () => {
    rpcMock.mockResolvedValue({
      data: {
        guest_id: 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee',
        signature: 'deadbeef',
      },
      error: null,
    });

    const { result } = renderHook(() => useGuestSession());

    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    expect(rpcMock).toHaveBeenCalledWith('create_guest_token');
    expect(result.current.guestId).toBe('aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee');
    const stored = safeGetItem<GuestSession>(GUEST_SESSION_KEY, {
      storage: 'localStorage',
    });
    expect(stored?.signature).toBe('deadbeef');
  });

  it('falls back to local UUID when RPC returns PostgREST-style error', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    rpcMock.mockResolvedValue({
      data: null,
      error: {
        message: 'Could not find the function public.create_guest_token',
      },
    });

    const { result } = renderHook(() => useGuestSession());

    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(result.current.guestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    const parsed = safeGetItem<GuestSession>(GUEST_SESSION_KEY, {
      storage: 'localStorage',
    });
    expect(parsed?.signature).toBeUndefined();
    warnSpy.mockRestore();
  });

  it('does not call RPC when session already exists in storage', async () => {
    const existing: GuestSession = {
      guestId: '11111111-2222-4333-8444-555555555555',
      signature: 'existing',
      createdAt: Date.now(),
      device: {
        deviceType: 'desktop',
        os: 'Windows',
        browser: 'Chrome',
      },
    };
    safeSetItem(GUEST_SESSION_KEY, existing, {
      storage: 'localStorage',
      ttl: 30 * 24 * 60 * 60 * 1000,
    });

    const { result } = renderHook(() => useGuestSession());

    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    expect(rpcMock).not.toHaveBeenCalled();
    expect(result.current.guestId).toBe('11111111-2222-4333-8444-555555555555');
  });

  it('getSessionData returns shape expected by checkout after RPC success', async () => {
    rpcMock.mockResolvedValue({
      data: {
        guest_id: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
        signature: 'sig',
      },
      error: null,
    });

    const { result } = renderHook(() => useGuestSession());

    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    const data = result.current.getSessionData();
    expect(data).toEqual({
      guest_id: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
      device_type: 'desktop',
      os: expect.any(String),
      browser: expect.any(String),
    });
  });
});
