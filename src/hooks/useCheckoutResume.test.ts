// src/hooks/useCheckoutResume.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCheckoutResume } from './useCheckoutResume';
import { safeSetItem, safeRemoveItem } from '@/lib/storage/safeStorage';

const CHECKOUT_FORM_KEY = 'checkout_form_data';
const CHECKOUT_STEP_KEY = 'checkout_current_step';
const CHECKOUT_TIMESTAMP_KEY = 'checkout_timestamp';

describe('useCheckoutResume', () => {
  beforeEach(() => {
    safeRemoveItem(CHECKOUT_FORM_KEY, { storage: 'localStorage' });
    safeRemoveItem(CHECKOUT_STEP_KEY, { storage: 'localStorage' });
    safeRemoveItem(CHECKOUT_TIMESTAMP_KEY, { storage: 'localStorage' });
  });

  it('returns hasPendingCheckout: false when storage is empty', async () => {
    const { result } = renderHook(() => useCheckoutResume());

    await waitFor(() => {
      expect(result.current.hasPendingCheckout).toBe(false);
      expect(result.current.savedStep).toBe(1);
      expect(result.current.isExpired).toBe(true);
    });
  });

  it('returns hasPendingCheckout: true when valid form data and step exist', async () => {
    const formData = {
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean@example.com',
      address: '123 Rue de Paris',
    };
    safeSetItem(CHECKOUT_FORM_KEY, formData, { storage: 'localStorage' });
    safeSetItem(CHECKOUT_STEP_KEY, 2, { storage: 'localStorage' });
    safeSetItem(CHECKOUT_TIMESTAMP_KEY, Date.now(), {
      storage: 'localStorage',
    });

    const { result } = renderHook(() => useCheckoutResume());

    await waitFor(() => {
      expect(result.current.hasPendingCheckout).toBe(true);
      expect(result.current.savedStep).toBe(2);
      expect(result.current.isExpired).toBe(false);
    });
  });

  it('returns isExpired: true when timestamp is older than 24h', async () => {
    const formData = {
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean@example.com',
      address: '123 Rue de Paris',
    };
    safeSetItem(CHECKOUT_FORM_KEY, formData, { storage: 'localStorage' });
    safeSetItem(CHECKOUT_STEP_KEY, 2, { storage: 'localStorage' });
    const oldTimestamp = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago
    safeSetItem(CHECKOUT_TIMESTAMP_KEY, oldTimestamp, {
      storage: 'localStorage',
    });

    const { result } = renderHook(() => useCheckoutResume());

    await waitFor(() => {
      expect(result.current.isExpired).toBe(true);
      expect(result.current.hasPendingCheckout).toBe(false);
    });
  });

  it('returns isExpired: false when timestamp is within 24h', async () => {
    const formData = {
      firstName: 'Marie',
      lastName: 'Martin',
      email: 'marie@example.com',
      address: '45 Avenue des Champs',
    };
    safeSetItem(CHECKOUT_FORM_KEY, formData, { storage: 'localStorage' });
    safeSetItem(CHECKOUT_STEP_KEY, 3, { storage: 'localStorage' });
    safeSetItem(CHECKOUT_TIMESTAMP_KEY, Date.now() - 60 * 60 * 1000, {
      storage: 'localStorage',
    }); // 1 hour ago

    const { result } = renderHook(() => useCheckoutResume());

    await waitFor(() => {
      expect(result.current.isExpired).toBe(false);
      expect(result.current.hasPendingCheckout).toBe(true);
      expect(result.current.savedStep).toBe(3);
    });
  });

  it('returns hasPendingCheckout: false when form data has no meaningful fields', async () => {
    safeSetItem(
      CHECKOUT_FORM_KEY,
      { firstName: '', lastName: '', email: '', address: '' },
      {
        storage: 'localStorage',
      }
    );
    safeSetItem(CHECKOUT_STEP_KEY, 2, { storage: 'localStorage' });
    safeSetItem(CHECKOUT_TIMESTAMP_KEY, Date.now(), {
      storage: 'localStorage',
    });

    const { result } = renderHook(() => useCheckoutResume());

    await waitFor(() => {
      expect(result.current.hasPendingCheckout).toBe(false);
    });
  });

  it('returns hasPendingCheckout: false when timestamp is missing', async () => {
    const formData = {
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean@example.com',
      address: '123 Rue de Paris',
    };
    safeSetItem(CHECKOUT_FORM_KEY, formData, { storage: 'localStorage' });
    safeSetItem(CHECKOUT_STEP_KEY, 2, { storage: 'localStorage' });
    // No timestamp set

    const { result } = renderHook(() => useCheckoutResume());

    await waitFor(() => {
      expect(result.current.isExpired).toBe(true);
      expect(result.current.hasPendingCheckout).toBe(false);
    });
  });
});
