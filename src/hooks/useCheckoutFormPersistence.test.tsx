// src/hooks/useCheckoutFormPersistence.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/context/AuthContext';
import { useCheckoutFormPersistence } from './useCheckoutFormPersistence';
import {
  safeSetItem,
  safeRemoveItem,
  safeGetItem,
} from '@/lib/storage/safeStorage';

const CHECKOUT_FORM_KEY = 'checkout_form_data';
const CHECKOUT_STEP_KEY = 'checkout_current_step';
const CHECKOUT_COMPLETED_STEPS_KEY = 'checkout_completed_steps';
const CHECKOUT_TIMESTAMP_KEY = 'checkout_timestamp';
const CHECKOUT_COUPON_KEY = 'checkout_applied_coupon';

vi.mock('@/stores', () => ({ initializeWishlistStore: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              maybeSingle: vi
                .fn()
                .mockResolvedValue({ data: null, error: null }),
            }),
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

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>{children}</AuthProvider>
  </QueryClientProvider>
);

describe('useCheckoutFormPersistence', () => {
  beforeEach(() => {
    safeRemoveItem(CHECKOUT_FORM_KEY, { storage: 'localStorage' });
    safeRemoveItem(CHECKOUT_FORM_KEY, { storage: 'sessionStorage' });
    safeRemoveItem(CHECKOUT_STEP_KEY, { storage: 'localStorage' });
    safeRemoveItem(CHECKOUT_STEP_KEY, { storage: 'sessionStorage' });
    safeRemoveItem(CHECKOUT_COMPLETED_STEPS_KEY, { storage: 'localStorage' });
    safeRemoveItem(CHECKOUT_COMPLETED_STEPS_KEY, { storage: 'sessionStorage' });
    safeRemoveItem(CHECKOUT_TIMESTAMP_KEY, { storage: 'localStorage' });
    safeRemoveItem(CHECKOUT_COUPON_KEY, { storage: 'localStorage' });
    localStorage.removeItem('guest_session');
  });

  it('returns empty form when storage is empty', async () => {
    const { result } = renderHook(() => useCheckoutFormPersistence(), {
      wrapper,
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 4000 }
    );

    expect(result.current.formData.firstName).toBe('');
    expect(result.current.formData.email).toBe('');
    expect(result.current.savedStep).toBe(1);
    expect(result.current.savedCompletedSteps).toEqual([]);
    expect(result.current.savedCoupon).toBeNull();
  });

  it('loads form data from localStorage when valid and within 24h TTL', async () => {
    const cachedForm = {
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean@example.com',
      phone: '0612345678',
      address: '123 Rue de Paris',
      addressComplement: 'Apt 4',
      postalCode: '75001',
      city: 'Paris',
      country: 'FR' as const,
    };
    safeSetItem(CHECKOUT_FORM_KEY, cachedForm, { storage: 'localStorage' });
    safeSetItem(CHECKOUT_STEP_KEY, 2, { storage: 'localStorage' });
    safeSetItem(CHECKOUT_COMPLETED_STEPS_KEY, [1], { storage: 'localStorage' });
    safeSetItem(CHECKOUT_TIMESTAMP_KEY, Date.now(), {
      storage: 'localStorage',
    });

    const { result } = renderHook(() => useCheckoutFormPersistence(), {
      wrapper,
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 4000 }
    );

    expect(result.current.formData.firstName).toBe('Jean');
    expect(result.current.formData.email).toBe('jean@example.com');
    expect(result.current.savedStep).toBe(2);
    expect(result.current.savedCompletedSteps).toEqual([1]);
  });

  it('saveFormData persists form to localStorage', async () => {
    const { result } = renderHook(() => useCheckoutFormPersistence(), {
      wrapper,
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 4000 }
    );

    act(() => {
      result.current.setFormData((prev) => ({
        ...prev,
        firstName: 'Marie',
        lastName: 'Martin',
        email: 'marie@example.com',
        address: '45 Avenue des Champs',
      }));
    });

    act(() => {
      result.current.saveFormData();
    });

    await waitFor(() => {
      const stored = safeGetItem<typeof result.current.formData>(
        CHECKOUT_FORM_KEY,
        {
          storage: 'localStorage',
        }
      );
      expect(stored?.firstName).toBe('Marie');
      expect(stored?.email).toBe('marie@example.com');
    });
  });

  it('clearSavedData removes all checkout data from storage', async () => {
    safeSetItem(
      CHECKOUT_FORM_KEY,
      {
        firstName: 'Test',
        lastName: '',
        email: '',
        address: '',
        addressComplement: '',
        postalCode: '',
        city: '',
        country: 'FR',
      },
      {
        storage: 'localStorage',
      }
    );
    safeSetItem(CHECKOUT_STEP_KEY, 2, { storage: 'localStorage' });
    safeSetItem(CHECKOUT_TIMESTAMP_KEY, Date.now(), {
      storage: 'localStorage',
    });

    const { result } = renderHook(() => useCheckoutFormPersistence(), {
      wrapper,
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 4000 }
    );

    act(() => {
      result.current.clearSavedData();
    });

    expect(
      safeGetItem(CHECKOUT_FORM_KEY, { storage: 'localStorage' })
    ).toBeNull();
    expect(
      safeGetItem(CHECKOUT_STEP_KEY, { storage: 'localStorage' })
    ).toBeNull();
    expect(
      safeGetItem(CHECKOUT_TIMESTAMP_KEY, { storage: 'localStorage' })
    ).toBeNull();
    expect(result.current.formData.firstName).toBe('');
    expect(result.current.savedStep).toBe(1);
  });

  it('saveStepState persists step and completed steps', async () => {
    const { result } = renderHook(() => useCheckoutFormPersistence(), {
      wrapper,
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 4000 }
    );

    act(() => {
      result.current.saveStepState(3, [1, 2]);
    });

    expect(
      safeGetItem<number>(CHECKOUT_STEP_KEY, { storage: 'localStorage' })
    ).toBe(3);
    expect(
      safeGetItem<number[]>(CHECKOUT_COMPLETED_STEPS_KEY, {
        storage: 'localStorage',
      })
    ).toEqual([1, 2]);
    expect(result.current.savedStep).toBe(3);
    expect(result.current.savedCompletedSteps).toEqual([1, 2]);
  });

  it('saveCoupon persists coupon to localStorage', async () => {
    const { result } = renderHook(() => useCheckoutFormPersistence(), {
      wrapper,
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 4000 }
    );

    const coupon = {
      id: 'c1',
      code: 'SAVE10',
      type: 'percentage' as const,
      value: 10,
      minimum_order_amount: 50,
      maximum_discount_amount: 20,
    };

    act(() => {
      result.current.saveCoupon(coupon);
    });

    expect(
      safeGetItem(CHECKOUT_COUPON_KEY, { storage: 'localStorage' })
    ).toEqual(coupon);
    expect(result.current.savedCoupon).toEqual(coupon);
  });

  it('saveCoupon with null clears coupon', async () => {
    safeSetItem(
      CHECKOUT_COUPON_KEY,
      {
        id: 'c1',
        code: 'SAVE10',
        type: 'percentage',
        value: 10,
        minimum_order_amount: null,
        maximum_discount_amount: null,
      },
      {
        storage: 'localStorage',
      }
    );

    const { result } = renderHook(() => useCheckoutFormPersistence(), {
      wrapper,
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 4000 }
    );

    act(() => {
      result.current.saveCoupon(null);
    });

    expect(
      safeGetItem(CHECKOUT_COUPON_KEY, { storage: 'localStorage' })
    ).toBeNull();
    expect(result.current.savedCoupon).toBeNull();
  });
});
