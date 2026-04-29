/**
 * Checkout page smoke tests — Vitest — data-testid contracts on early-return branches.
 * Full funnel remains covered by Cypress (`e2e:checkout`).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Checkout from './Checkout';

const useCheckoutMock = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useCheckoutPage', () => ({
  useCheckoutPage: () => useCheckoutMock(),
}));

vi.mock('@/components/seo/SEOHelmet', () => ({
  default: () => null,
}));

vi.mock('@/utils/cacheOptimization', () => ({
  disableServiceWorkerForCriticalFlow: vi.fn(() => Promise.resolve()),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { returnObjects?: boolean }) =>
      opts?.returnObjects ? [] : key,
    i18n: { language: 'en' },
  }),
}));

const futureFlags = { v7_startTransition: true, v7_relativeSplatPath: true };

describe('Checkout page — selector contracts', () => {
  beforeEach(() => {
    useCheckoutMock.mockReturnValue({
      hasPendingProductResolution: false,
      cartItems: [],
      t: (k: string) => k,
    });
  });

  it('empty cart exposes checkout-page-empty-cart', () => {
    render(
      <MemoryRouter future={futureFlags}>
        <Checkout />
      </MemoryRouter>
    );

    expect(screen.getByTestId('checkout-page-empty-cart')).toBeInTheDocument();
  });

  it('pending product resolution exposes checkout-page-resolving', () => {
    useCheckoutMock.mockReturnValue({
      hasPendingProductResolution: true,
      cartItems: [],
      t: (k: string) => k,
    });

    render(
      <MemoryRouter future={futureFlags}>
        <Checkout />
      </MemoryRouter>
    );

    expect(screen.getByTestId('checkout-page-resolving')).toBeInTheDocument();
  });
});
