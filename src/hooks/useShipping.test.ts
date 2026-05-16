/**
 * Tests for useShipping (postal code → ShippingCalculation, message, zones).
 *
 * Prerequisites: mocked `@/services/shippingService` and `@/stores/currencyStore.useCurrency`.
 * Run: npx vitest run src/hooks/useShipping.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const { calculateShipping, getShippingZones, isNantesMetropole } = vi.hoisted(
  () => ({
    calculateShipping: vi.fn(),
    getShippingZones: vi.fn(),
    isNantesMetropole: vi.fn(),
  })
);

vi.mock('@/services/shippingService', () => ({
  shippingService: {
    calculateShipping: (...a: unknown[]) => calculateShipping(...a),
    getShippingZones: (...a: unknown[]) => getShippingZones(...a),
    isNantesMetropole: (...a: unknown[]) => isNantesMetropole(...a),
  },
}));

vi.mock('@/stores/currencyStore', () => ({
  useCurrency: () => ({
    formatPrice: (price: number) => `${price.toFixed(2)} €`,
  }),
}));

import { useShipping } from './useShipping';

describe('useShipping', () => {
  beforeEach(() => {
    calculateShipping.mockReset();
    getShippingZones.mockReset();
    isNantesMetropole.mockReset();
  });

  it('returns null calculation when disabled or postalCode is empty', () => {
    const { result } = renderHook(() => useShipping({}));
    expect(result.current.calculation).toBeNull();
    expect(calculateShipping).not.toHaveBeenCalled();
  });

  it('calls calculateShipping with postalCode + orderAmount', async () => {
    calculateShipping.mockResolvedValue({
      zone: { name: 'France' },
      is_free: false,
      cost: 7.9,
      delivery_estimate: '3-5 jours',
    });

    const { result } = renderHook(() =>
      useShipping({ postalCode: '75001', orderAmount: 50 })
    );

    await waitFor(() => expect(result.current.calculation).not.toBeNull());
    expect(calculateShipping).toHaveBeenCalledWith('75001', 50);
  });

  it('formats getShippingMessage for paid shipping with savings hint', async () => {
    calculateShipping.mockResolvedValue({
      zone: { name: 'France' },
      is_free: false,
      cost: 7.9,
      delivery_estimate: '3-5 jours',
      savings: 12,
    });

    const { result } = renderHook(() =>
      useShipping({ postalCode: '75001', orderAmount: 38 })
    );
    await waitFor(() => expect(result.current.calculation).not.toBeNull());

    const msg = result.current.getShippingMessage();
    expect(msg).toMatch(/Livraison/);
    expect(msg).toMatch(/12\.00 €/);
  });

  it('formats getShippingMessage for free shipping in Nantes', async () => {
    calculateShipping.mockResolvedValue({
      zone: { name: 'Nantes Métropole' },
      is_free: true,
      cost: 0,
      delivery_estimate: '1-2 jours',
    });

    const { result } = renderHook(() =>
      useShipping({ postalCode: '44000', orderAmount: 100 })
    );
    await waitFor(() => expect(result.current.calculation).not.toBeNull());

    expect(result.current.getShippingMessage()).toMatch(
      /gratuite sur la métropole Nantaise/
    );
  });

  it('loadZones populates the zones list', async () => {
    getShippingZones.mockResolvedValue([
      { id: 1, name: 'France' },
      { id: 2, name: 'Nantes' },
    ]);

    const { result } = renderHook(() => useShipping({}));
    await act(async () => {
      await result.current.loadZones();
    });
    expect(result.current.zones).toHaveLength(2);
  });

  it('captures errors raised by the service', async () => {
    const consoleErr = vi.spyOn(console, 'error').mockImplementation(() => {});
    calculateShipping.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useShipping({ postalCode: '75001' }));
    await waitFor(() => expect(result.current.error).toBe('boom'));
    expect(result.current.calculation).toBeNull();
    consoleErr.mockRestore();
  });
});
