/**
 * Auth page smoke tests — Vitest + jsdom — stable selectors for Cypress contract.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Auth from './Auth';

const signInSpy = vi.fn().mockResolvedValue({ user: null, session: null });
const signUpSpy = vi.fn().mockResolvedValue({ user: null, session: null });

vi.mock('@/context/AuthContext', () => ({
  useOptimizedAuth: () => ({
    user: null,
    session: null,
    profile: null,
    role: 'anonymous',
    isLoading: false,
    isInitialized: true,
    isRoleLoading: false,
    isAuthenticated: false,
    signIn: signInSpy,
    signUp: signUpSpy,
    signOut: vi.fn(),
    signInWithOtp: vi.fn(),
    verifyOtp: vi.fn(),
    resetPassword: vi.fn(),
    updatePassword: vi.fn(),
    updateProfile: vi.fn(),
    refreshProfile: vi.fn(),
    refreshRole: vi.fn(async () => 'user'),
  }),
}));

vi.mock('@/hooks/useCsrfToken', () => ({
  useCsrfToken: () => ({ csrfToken: 'test-csrf' }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
    dismiss: vi.fn(),
  }),
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

function renderAuth() {
  return render(
    <MemoryRouter future={futureFlags}>
      <Auth />
    </MemoryRouter>
  );
}

describe('Auth page', () => {
  beforeEach(() => {
    signInSpy.mockClear();
    signUpSpy.mockClear();
  });

  it('exposes sign-in form contract (data-testid + ids)', () => {
    renderAuth();

    const form = screen.getByTestId('auth-form');
    expect(form).toBeInTheDocument();
    expect(form.tagName.toLowerCase()).toBe('form');

    expect(within(form).getByTestId('auth-email')).toHaveAttribute(
      'id',
      'auth-email'
    );
    expect(within(form).getByTestId('auth-password')).toHaveAttribute(
      'id',
      'auth-password'
    );

    expect(screen.getByTestId('auth-submit')).toBeInTheDocument();

    expect(screen.queryByTestId('auth-name')).not.toBeInTheDocument();

    expect(screen.getByTestId('auth-toggle-signup')).toBeInTheDocument();
    expect(screen.queryByTestId('auth-toggle-signin')).not.toBeInTheDocument();
  });

  it('sign-up view adds name / confirm-password and toggle back to sign-in', () => {
    renderAuth();

    fireEvent.click(screen.getByTestId('auth-toggle-signup'));

    expect(screen.getByTestId('auth-name')).toBeInTheDocument();
    expect(screen.getByTestId('auth-confirm-password')).toBeInTheDocument();
    expect(screen.getByTestId('auth-toggle-signin')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('auth-toggle-signin'));

    expect(screen.queryByTestId('auth-name')).not.toBeInTheDocument();
    expect(screen.getByTestId('auth-email')).toBeInTheDocument();
  });
});
