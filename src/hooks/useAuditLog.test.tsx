/**
 * Tests for useAuditLog (sessionStorage append-only log under current user).
 *
 * Prerequisites: mocks `@/context/AuthContext.useAuth` to inject the user.
 * Run: npx vitest run src/hooks/useAuditLog.test.tsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { useAuthMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn<() => { user: { id: string } | null }>(),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

import { useAuditLog } from './useAuditLog';

describe('useAuditLog', () => {
  beforeEach(() => {
    sessionStorage.clear();
    useAuthMock.mockReset();
  });

  it('does nothing when there is no user', async () => {
    useAuthMock.mockReturnValue({ user: null });

    const { result } = renderHook(() => useAuditLog());
    await act(async () => {
      await result.current.logAction('view', 'order', 'o1');
    });
    expect(sessionStorage.getItem('audit_logs')).toBeNull();
  });

  it('appends a log entry under the current user', async () => {
    useAuthMock.mockReturnValue({ user: { id: 'user-1' } });

    const { result } = renderHook(() => useAuditLog());
    await act(async () => {
      await result.current.logAction('view', 'order', 'o1', {
        description: 'opened order',
      });
    });

    const stored = JSON.parse(sessionStorage.getItem('audit_logs')!);
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      user_id: 'user-1',
      action: 'view',
      entity_type: 'order',
      entity_id: 'o1',
      details: { description: 'opened order' },
    });
    expect(stored[0].id).toBeTruthy();
    expect(stored[0].created_at).toBeTruthy();
  });

  it('caps the log at 100 entries (most recent kept)', async () => {
    useAuthMock.mockReturnValue({ user: { id: 'user-1' } });

    // Pre-seed 100 entries that should be evicted
    const seed = Array.from({ length: 100 }, (_, i) => ({
      user_id: 'user-1',
      action: 'old',
      entity_type: 'order',
      entity_id: `seed-${i}`,
    }));
    sessionStorage.setItem('audit_logs', JSON.stringify(seed));

    const { result } = renderHook(() => useAuditLog());
    await act(async () => {
      await result.current.logAction('newest', 'order', 'fresh');
    });

    const stored = JSON.parse(sessionStorage.getItem('audit_logs')!);
    expect(stored).toHaveLength(100);
    expect(stored[stored.length - 1]).toMatchObject({
      action: 'newest',
      entity_id: 'fresh',
    });
  });

  it('getAuditLogs returns the stored entries', async () => {
    useAuthMock.mockReturnValue({ user: { id: 'user-1' } });

    const { result } = renderHook(() => useAuditLog());
    await act(async () => {
      await result.current.logAction('a', 'order');
      await result.current.logAction('b', 'order');
    });
    expect(result.current.getAuditLogs()).toHaveLength(2);
  });
});
