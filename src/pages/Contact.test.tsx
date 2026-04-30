/**
 * Contact page smoke test (Vitest + jsdom).
 *
 * Prerequisites: `pnpm run test:unit` or `npx vitest run src/pages/Contact.test.tsx`.
 * Mocks below: SEO (helmet provider not in jsdom tree), network, lazy map.
 * E2E: `pnpm run e2e:contact`.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Contact from './Contact';

vi.mock('@/hooks/useCompanySettings', () => ({
  useCompanySettings: () => ({
    settings: {
      name: 'Test Shop',
      email: 'support@example.com',
      phone: '+1 555 0100',
      address: {
        street: '1 Test St',
        postalCode: '75001',
        city: 'Paris',
        country: 'France',
        latitude: 48.8566,
        longitude: 2.3522,
      },
      openingHours: {
        weekdays: 'Mon–Fri 9–18',
        saturday: 'Sat 10–16',
        sunday: 'Sun closed',
      },
    },
    isLoading: false,
  }),
  formatFullAddress: (a: {
    street: string;
    postalCode: string;
    city: string;
    country: string;
  }) => `${a.street}, ${a.postalCode} ${a.city}, ${a.country}`,
}));

vi.mock('@/hooks/useCsrfToken', () => ({
  useCsrfToken: () => ({ csrfToken: 'test-csrf' }),
}));

vi.mock('@/services/cartApi', () => ({
  getAuthSession: vi.fn().mockResolvedValue({ data: { session: null } }),
}));

const postMock = vi.fn().mockResolvedValue({});

vi.mock('@/lib/api/apiClient', () => ({
  apiClient: {
    post: (...args: unknown[]) => postMock(...args),
  },
}));

vi.mock('@/lib/invoice/supabaseFunctionsBaseUrl', () => ({
  supabaseFunctionsV1BaseUrl: () => 'https://example.supabase.co/functions/v1',
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    message: vi.fn(),
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

vi.mock('@/components/ui/LocationMap', () => ({
  default: () => <div data-testid="location-map-placeholder" />,
}));

vi.mock('@/components/seo/SEOHelmet', () => ({
  default: () => null,
}));

const futureFlags = { v7_startTransition: true, v7_relativeSplatPath: true };

describe('Contact page', () => {
  beforeEach(() => {
    postMock.mockClear();
    window.scrollTo = vi.fn();
  });

  it('renders hero, form fields, submit control, and map section', async () => {
    render(
      <MemoryRouter future={futureFlags}>
        <Contact />
      </MemoryRouter>
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'contact.hero.title' })
    ).toBeInTheDocument();
    expect(document.getElementById('firstName')).toBeInTheDocument();
    expect(document.getElementById('lastName')).toBeInTheDocument();
    expect(document.getElementById('email')).toBeInTheDocument();
    expect(document.getElementById('subject')).toBeInTheDocument();
    expect(document.getElementById('message')).toBeInTheDocument();
    expect(document.getElementById('contact-form-submit')).toBeInTheDocument();

    expect(
      await screen.findByTestId('location-map-placeholder')
    ).toBeInTheDocument();
  });
});
