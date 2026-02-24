// src/context/AuthContext.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth, cleanupAuthState } from './AuthContext';

// Mock wishlist store to avoid Supabase calls during AuthProvider init
vi.mock('@/stores', () => ({
  initializeWishlistStore: vi.fn(),
}));

// Mock Supabase client - includes order() and channel() for wishlist/realtime
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      signInWithOtp: vi.fn(),
      verifyOtp: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    }),
  },
}));

// Import after mocking
import { supabase } from '@/integrations/supabase/client';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>{children}</AuthProvider>
  </QueryClientProvider>
);

describe('cleanupAuthState', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should remove Supabase auth keys from localStorage', () => {
    localStorage.setItem('supabase.auth.token', 'test');
    localStorage.setItem('sb-project-auth-token', 'test');
    localStorage.setItem('other-key', 'keep');

    cleanupAuthState();

    expect(localStorage.getItem('supabase.auth.token')).toBeNull();
    expect(localStorage.getItem('sb-project-auth-token')).toBeNull();
    expect(localStorage.getItem('other-key')).toBe('keep');
  });

  it('should remove Supabase auth keys from sessionStorage', () => {
    sessionStorage.setItem('supabase.auth.token', 'test');
    sessionStorage.setItem('sb-test-auth', 'test');
    sessionStorage.setItem('other-key', 'keep');

    cleanupAuthState();

    expect(sessionStorage.getItem('supabase.auth.token')).toBeNull();
    expect(sessionStorage.getItem('sb-test-auth')).toBeNull();
    expect(sessionStorage.getItem('other-key')).toBe('keep');
  });
});

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should provide initial auth state', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should initialize with existing session', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockSession = { user: mockUser, access_token: 'token' };

    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: mockSession as any },
      error: null,
    });
    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
      data: { user: mockUser as any },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should throw error when useAuth is used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');
    consoleSpy.mockRestore();
  });
});

describe('useAuth methods', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('signIn', () => {
    it('should call supabase signInWithPassword', async () => {
      const mockData = {
        user: { id: '123' },
        session: { access_token: 'token' },
      };
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: mockData as any,
        error: null,
      });
      vi.mocked(supabase.auth.signOut).mockResolvedValueOnce({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      await act(async () => {
        await result.current.signIn('test@example.com', 'password');
      });

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password',
      });
    });

    it('should throw error on failed signIn', async () => {
      const error = new Error('Invalid credentials');
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: error as any,
      });
      vi.mocked(supabase.auth.signOut).mockResolvedValueOnce({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      await expect(
        act(async () => {
          await result.current.signIn('test@example.com', 'wrong');
        })
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('signUp', () => {
    it('should call supabase signUp with correct options', async () => {
      const mockData = { user: { id: '123' }, session: null };
      vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
        data: mockData as any,
        error: null,
      });
      vi.mocked(supabase.auth.signOut).mockResolvedValueOnce({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      await act(async () => {
        await result.current.signUp(
          'test@example.com',
          'password',
          'John Doe',
          '+33123456789'
        );
      });

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password',
        options: expect.objectContaining({
          data: {
            full_name: 'John Doe',
            phone: '+33123456789',
          },
        }),
      });
    });
  });

  describe('signOut', () => {
    it('should call supabase signOut with global scope', async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValueOnce({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      await act(async () => {
        await result.current.signOut();
      });

      expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    });
  });

  describe('signInWithOtp', () => {
    it('should call supabase signInWithOtp', async () => {
      vi.mocked(supabase.auth.signInWithOtp).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      await act(async () => {
        await result.current.signInWithOtp('test@example.com');
      });

      expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        options: expect.objectContaining({
          shouldCreateUser: true,
        }),
      });
    });
  });

  describe('verifyOtp', () => {
    it('should call supabase verifyOtp', async () => {
      const mockData = {
        user: { id: '123' },
        session: { access_token: 'token' },
      };
      vi.mocked(supabase.auth.verifyOtp).mockResolvedValueOnce({
        data: mockData as any,
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      await act(async () => {
        await result.current.verifyOtp('test@example.com', '123456');
      });

      expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        token: '123456',
        type: 'email',
      });
    });
  });

  describe('resetPassword', () => {
    it('should call supabase resetPasswordForEmail', async () => {
      vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValueOnce({
        data: {},
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      await act(async () => {
        await result.current.resetPassword('test@example.com');
      });

      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({
          redirectTo: expect.stringContaining('/auth/reset-password'),
        })
      );
    });
  });

  describe('updatePassword', () => {
    it('should call supabase updateUser', async () => {
      vi.mocked(supabase.auth.updateUser).mockResolvedValueOnce({
        data: { user: { id: '123' } as any },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      await act(async () => {
        await result.current.updatePassword('newPassword123');
      });

      expect(supabase.auth.updateUser).toHaveBeenCalledWith({
        password: 'newPassword123',
      });
    });
  });
});
