import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import OrderConfirmation from './OrderConfirmation';

const mockInvoke = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  },
}));

vi.mock('@/utils/cacheOptimization', () => ({
  disableServiceWorkerForCriticalFlow: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/components/PageFooter', () => ({
  default: () => null,
}));

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/order-confirmation/:orderReference" element={<OrderConfirmation />} />
        <Route path="/order-confirmation" element={<OrderConfirmation />} />
      </Routes>
    </MemoryRouter>
  );

describe('OrderConfirmation 3-page outcomes', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    localStorage.clear();
  });

  it('renders success page from lookup payload', async () => {
    mockInvoke.mockResolvedValueOnce({
      error: null,
      data: {
        found: true,
        page_variant: 'success',
        order_id: 'a2f4d777-e4f2-4541-a948-c6f9fd2af9aa',
        order_reference: 'CMD-ABCDE12345',
        amount: 1.14,
        currency: 'EUR',
        customer_name: 'Mars Kassius',
        customer_email: 'mars@example.com',
        created_at: new Date().toISOString(),
        status_label: 'En cours de traitement',
        status_message: 'Votre commande est en cours de preparation.',
        items: [],
      },
    });

    renderAt('/order-confirmation/CMD-ABCDE12345?token=test-token');

    await waitFor(() =>
      expect(screen.getByText('Paiement confirme')).toBeInTheDocument()
    );
    expect(screen.getByText(/Commande #CMD-ABCDE12345/)).toBeInTheDocument();
  });

  it('renders payment_failed page from lookup payload', async () => {
    mockInvoke.mockResolvedValueOnce({
      error: null,
      data: {
        found: true,
        page_variant: 'payment_failed',
        order_id: 'a2f4d777-e4f2-4541-a948-c6f9fd2af9aa',
        order_reference: 'CMD-FAILED1234',
        amount: 1.14,
        currency: 'EUR',
        customer_name: 'Client inconnu',
        customer_email: 'anon@example.com',
        created_at: new Date().toISOString(),
        status_label: 'Paiement non abouti',
        status_message: "Nous n'avons pas pu finaliser votre paiement.",
        items: [],
      },
    });

    renderAt('/order-confirmation/CMD-FAILED1234?token=test-token');

    await waitFor(() =>
      expect(
        screen.getByText("Oups... le paiement n'a pas abouti")
      ).toBeInTheDocument()
    );
    expect(screen.getByText(/Reessayer le paiement/)).toBeInTheDocument();
  });

  it('renders technical_issue page when lookup fails', async () => {
    mockInvoke.mockResolvedValueOnce({
      error: null,
      data: { found: false },
    });

    renderAt('/order-confirmation/CMD-ERR123456?token=test-token');

    await waitFor(() =>
      expect(
        screen.getByText("Oups... quelque chose n'a pas fonctionne")
      ).toBeInTheDocument()
    );
    expect(screen.getByText(/Contact Support/)).toBeInTheDocument();
  });
});
