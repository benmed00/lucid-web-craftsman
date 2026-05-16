/**
 * Tests for useReauthentication (password re-check + withReauth helper).
 *
 * Prerequisites: mocks `@/context/AuthContext.useAuth`, `@/services/authApi`,
 * and `sonner` toasts.
 * Run: npx vitest run src/hooks/useReauthentication.test.tsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { useAuthMock, signInWithPasswordForReauth, toastError, toastSuccess } =
  vi.hoisted(() => ({
    useAuthMock: vi.fn<() => { user: { email: string } | null }>(),
    signInWithPasswordForReauth: vi.fn(),
    toastError: vi.fn(),
    toastSuccess: vi.fn(),
  }));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/services/authApi', () => ({
  signInWithPasswordForReauth: (...args: unknown[]) =>
    signInWithPasswordForReauth(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    error: (...a: unknown[]) => toastError(...a),
    success: (...a: unknown[]) => toastSuccess(...a),
  },
}));

import { useReauthentication } from './useReauthentication';

describe('useReauthentication', () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    signInWithPasswordForReauth.mockReset();
    toastError.mockReset();
    toastSuccess.mockReset();
  });

  it('refuses when there is no current user email', async () => {
    useAuthMock.mockReturnValue({ user: null });

    const { result } = renderHook(() => useReauthentication());
    let resp: { success: boolean; error?: string } | undefined;
    await act(async () => {
      resp = await result.current.reauthenticate('any');
    });
    expect(resp).toEqual({
      success: false,
      error: 'Utilisateur non connecté',
    });
    expect(signInWithPasswordForReauth).not.toHaveBeenCalled();
  });

  it('returns success when Supabase confirms the password', async () => {
    useAuthMock.mockReturnValue({ user: { email: 'u@ex.com' } });
    signInWithPasswordForReauth.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useReauthentication());
    let resp: { success: boolean; error?: string } | undefined;
    await act(async () => {
      resp = await result.current.reauthenticate('correct');
    });

    expect(signInWithPasswordForReauth).toHaveBeenCalledWith(
      'u@ex.com',
      'correct'
    );
    expect(resp).toEqual({ success: true });
  });

  it('returns failure when Supabase rejects the password', async () => {
    useAuthMock.mockReturnValue({ user: { email: 'u@ex.com' } });
    signInWithPasswordForReauth.mockResolvedValue({
      error: new Error('bad password'),
    });

    const { result } = renderHook(() => useReauthentication());
    let resp: { success: boolean; error?: string } | undefined;
    await act(async () => {
      resp = await result.current.reauthenticate('wrong');
    });
    expect(resp).toEqual({ success: false, error: 'Mot de passe incorrect' });
  });

  it('withReauth runs the action only after successful reauth', async () => {
    useAuthMock.mockReturnValue({ user: { email: 'u@ex.com' } });
    signInWithPasswordForReauth.mockResolvedValue({ error: null });

    const action = vi.fn().mockResolvedValue('value');

    const { result } = renderHook(() => useReauthentication());
    let resp: { success: boolean; result?: string; error?: string } | undefined;
    await act(async () => {
      resp = await result.current.withReauth('ok', action, 'sensitive');
    });
    expect(action).toHaveBeenCalled();
    expect(resp).toEqual({ success: true, result: 'value' });
    expect(toastSuccess).toHaveBeenCalled();
  });

  it('withReauth toasts an error and skips the action on bad password', async () => {
    useAuthMock.mockReturnValue({ user: { email: 'u@ex.com' } });
    signInWithPasswordForReauth.mockResolvedValue({
      error: new Error('bad'),
    });
    const action = vi.fn();

    const { result } = renderHook(() => useReauthentication());
    let resp: { success: boolean; error?: string } | undefined;
    await act(async () => {
      resp = await result.current.withReauth('nope', action);
    });
    expect(action).not.toHaveBeenCalled();
    expect(resp?.success).toBe(false);
    expect(toastError).toHaveBeenCalled();
  });
});
