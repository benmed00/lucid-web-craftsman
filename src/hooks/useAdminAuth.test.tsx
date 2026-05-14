/**
 * Tests for useAdminAuth (RBAC view of AuthContext).
 *
 * Prerequisites: mocks `@/context/AuthContext.useAuth` and `@/lib/rbac` so the
 * hook is exercised without booting the real Supabase-backed AuthProvider.
 * Run: npx vitest run src/hooks/useAdminAuth.test.tsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

type FakeUser = {
  id: string;
  email: string | null;
  user_metadata?: { full_name?: string };
} | null;

type FakeAuth = {
  user: FakeUser;
  role: 'admin' | 'super_admin' | 'user' | 'guest';
  isLoading: boolean;
  isRoleLoading: boolean;
  refreshRole: () => Promise<'admin' | 'super_admin' | 'user' | 'guest'>;
};

const { useAuthMock, canAdmin, logAccessDenied } = vi.hoisted(() => ({
  useAuthMock: vi.fn<() => FakeAuth>(),
  canAdmin: vi.fn(),
  logAccessDenied: vi.fn(),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/lib/rbac', () => ({
  canAdmin: (...args: unknown[]) => canAdmin(...args),
  logAccessDenied: (...args: unknown[]) => logAccessDenied(...args),
}));

import { useAdminAuth } from './useAdminAuth';

describe('useAdminAuth', () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    canAdmin.mockReset();
    logAccessDenied.mockReset();
  });

  it('returns isAuthenticated=false and adminUser=null when role does not grant admin', () => {
    useAuthMock.mockReturnValue({
      user: { id: 'u', email: 'u@ex.com' },
      role: 'user',
      isLoading: false,
      isRoleLoading: false,
      refreshRole: vi.fn().mockResolvedValue('user'),
    });
    canAdmin.mockReturnValue(false);

    const { result } = renderHook(() => useAdminAuth());
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('builds an adminUser when the user has admin role', () => {
    useAuthMock.mockReturnValue({
      user: {
        id: 'u',
        email: 'admin@ex.com',
        user_metadata: { full_name: 'Admin User' },
      },
      role: 'admin',
      isLoading: false,
      isRoleLoading: false,
      refreshRole: vi.fn().mockResolvedValue('admin'),
    });
    canAdmin.mockReturnValue(true);

    const { result } = renderHook(() => useAdminAuth());
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual({
      id: 'u',
      email: 'admin@ex.com',
      name: 'Admin User',
      role: 'admin',
      lastLogin: expect.any(String),
    });
  });

  it('maps role=super_admin to role=super-admin in the adminUser shape', () => {
    useAuthMock.mockReturnValue({
      user: { id: 'u', email: 'sa@ex.com' },
      role: 'super_admin',
      isLoading: false,
      isRoleLoading: false,
      refreshRole: vi.fn().mockResolvedValue('super_admin'),
    });
    canAdmin.mockReturnValue(true);

    const { result } = renderHook(() => useAdminAuth());
    expect(result.current.user?.role).toBe('super-admin');
  });

  it('reverifyAdmin calls refreshRole and logs on denial', async () => {
    const refreshRole = vi.fn().mockResolvedValue('user' as const);
    useAuthMock.mockReturnValue({
      user: { id: 'u', email: 'u@ex.com' },
      role: 'user',
      isLoading: false,
      isRoleLoading: false,
      refreshRole,
    });
    canAdmin.mockReturnValue(false);

    const { result } = renderHook(() => useAdminAuth());
    const ok = await result.current.reverifyAdmin();
    expect(ok).toBe(false);
    expect(refreshRole).toHaveBeenCalledTimes(1);
    expect(logAccessDenied).toHaveBeenCalledWith('user', 'reverifyAdmin');
  });

  it('reverifyAdmin returns true when refreshRole upgrades the role', async () => {
    const refreshRole = vi.fn().mockResolvedValue('admin' as const);
    useAuthMock.mockReturnValue({
      user: { id: 'u', email: 'u@ex.com' },
      role: 'user',
      isLoading: false,
      isRoleLoading: false,
      refreshRole,
    });
    canAdmin.mockImplementation((r: unknown) => r === 'admin');

    const { result } = renderHook(() => useAdminAuth());
    const ok = await result.current.reverifyAdmin();
    expect(ok).toBe(true);
  });

  it('isLoading aggregates authLoading and isRoleLoading', () => {
    useAuthMock.mockReturnValue({
      user: null,
      role: 'guest',
      isLoading: false,
      isRoleLoading: true,
      refreshRole: vi.fn().mockResolvedValue('guest'),
    });
    canAdmin.mockReturnValue(false);

    const { result } = renderHook(() => useAdminAuth());
    expect(result.current.isLoading).toBe(true);
  });
});
