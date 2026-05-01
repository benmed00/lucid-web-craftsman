/**
 * Auth page + AuthProvider wiring (integration smoke).
 *
 * Uses the same Supabase client mock boundary as AuthContext.test — confirms the
 * sign-in DOM matches production provider composition (Auth hooks not stubbed).
 */

import React, { type ReactNode } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import Auth from '@/pages/Auth';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from '@/components/ui/toaster';

vi.mock('@/stores', () => ({
  initializeWishlistStore: vi.fn(),
}));

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
    rpc: vi.fn().mockResolvedValue({ data: 'user', error: null }),
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

vi.mock('@/hooks/useCsrfToken', () => ({
  useCsrfToken: () => ({ csrfToken: 'test-csrf' }),
}));

vi.mock('@/components/auth/OTPAuthFlow', () => ({
  OTPAuthFlow: () => <div data-testid="otp-auth-flow-placeholder" />,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

const futureFlags = { v7_startTransition: true, v7_relativeSplatPath: true };

function IntegrationRoot({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/auth']} future={futureFlags}>
        <AuthProvider>
          <Toaster />
          {children}
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Auth + AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders sign-in chrome with auth testids once auth is initialized', async () => {
    render(
      <IntegrationRoot>
        <Auth />
      </IntegrationRoot>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-form')).toBeInTheDocument();
    });

    expect(screen.getByTestId('auth-submit')).toBeInTheDocument();
    expect(screen.getByTestId('auth-email')).toHaveAttribute(
      'id',
      'auth-email'
    );
  });
});
