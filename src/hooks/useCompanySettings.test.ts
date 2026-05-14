/**
 * Tests for useCompanySettings (module-level cache + defaults).
 *
 * Prerequisites: mocked `@/services/appSettingsApi`; we manually invalidate
 * the cache between tests via the exported helper.
 * Run: npx vitest run src/hooks/useCompanySettings.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const { fetchAppSettingValueByKey } = vi.hoisted(() => ({
  fetchAppSettingValueByKey: vi.fn(),
}));

vi.mock('@/services/appSettingsApi', () => ({
  fetchAppSettingValueByKey: (...a: unknown[]) =>
    fetchAppSettingValueByKey(...a),
}));

import {
  useCompanySettings,
  useCompanyAddress,
  useCompanyContact,
  invalidateCompanySettingsCache,
} from './useCompanySettings';

describe('useCompanySettings', () => {
  beforeEach(() => {
    invalidateCompanySettingsCache();
    fetchAppSettingValueByKey.mockReset();
  });

  it('merges DB values with defaults', async () => {
    fetchAppSettingValueByKey.mockResolvedValue({
      name: 'New Name',
      address: { city: 'Rabat', country: 'Morocco' },
    });

    const { result } = renderHook(() => useCompanySettings());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.settings.name).toBe('New Name');
    expect(result.current.settings.address.city).toBe('Rabat');
    expect(result.current.settings.address.country).toBe('Morocco');
    expect(result.current.settings.address.postalCode).toBe('44400');
    expect(result.current.settings.openingHours.sunday).toBe(
      'Dimanche: Fermé'
    );
  });

  it('falls back to defaults on service error', async () => {
    fetchAppSettingValueByKey.mockRejectedValue(new Error('rls denied'));

    const { result } = renderHook(() => useCompanySettings());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.settings.name).toBe('Rif Raw Straw');
    expect(result.current.error).toBe(
      'Erreur lors du chargement des paramètres'
    );
  });

  it('useCompanyAddress exposes the address subset', async () => {
    fetchAppSettingValueByKey.mockResolvedValue({});
    const { result } = renderHook(() => useCompanyAddress());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.address.country).toBe('France');
  });

  it('useCompanyContact exposes name/email/phone', async () => {
    fetchAppSettingValueByKey.mockResolvedValue({});
    const { result } = renderHook(() => useCompanyContact());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.email).toBe('contact@rifstraw.com');
  });
});
