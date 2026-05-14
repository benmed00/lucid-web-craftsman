/**
 * Tests for currencyStore (setCurrency, convertPrice, formatPrice).
 *
 * Prerequisites: mock `@/lib/api/apiClient` so fetchExchangeRates never hits
 * the network. Tests only exercise the deterministic conversion + formatting
 * paths on the default exchange rates.
 * Run: npx vitest run src/stores/currencyStore.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/api/apiClient', () => ({
  currencyApi: {
    get: vi.fn().mockResolvedValue({ rates: { USD: 1.09, GBP: 0.86 } }),
  },
}));

import { useCurrencyStore } from './currencyStore';

describe('useCurrencyStore', () => {
  beforeEach(() => {
    useCurrencyStore.setState({ currency: 'EUR' });
  });

  it('defaults to EUR', () => {
    expect(useCurrencyStore.getState().currency).toBe('EUR');
  });

  it('setCurrency updates the selection', () => {
    useCurrencyStore.getState().setCurrency('USD');
    expect(useCurrencyStore.getState().currency).toBe('USD');
  });

  it('convertPrice returns the same value when from equals to', () => {
    useCurrencyStore.getState().setCurrency('EUR');
    expect(useCurrencyStore.getState().convertPrice(100, 'EUR')).toBe(100);
  });

  it('convertPrice applies the EUR→USD rate', () => {
    useCurrencyStore.getState().setCurrency('USD');
    const converted = useCurrencyStore.getState().convertPrice(100, 'EUR');
    // default rates: 1 EUR = 1.09 USD → rounded to 2 decimals
    expect(converted).toBeCloseTo(109, 2);
  });

  it('formatPrice in EUR includes the euro symbol', () => {
    useCurrencyStore.getState().setCurrency('EUR');
    const out = useCurrencyStore.getState().formatPrice(50, 'EUR');
    expect(out).toMatch(/€|EUR/);
  });

  it('formatPrice in USD includes a dollar-style indicator', () => {
    useCurrencyStore.getState().setCurrency('USD');
    const out = useCurrencyStore.getState().formatPrice(50, 'EUR');
    expect(out).toMatch(/\$|US\$|USD/);
  });
});
