/**
 * Tests for useMaintenanceMode.
 *
 * Prerequisites: mocked `@/services/appSettingsApi`; fake timers for the 2 s
 * fetch defer and the 5 s realtime defer.
 * Run: npx vitest run src/hooks/useMaintenanceMode.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { fetchAppSettingValueByKey, subscribeAppSettingByKey } = vi.hoisted(
  () => ({
    fetchAppSettingValueByKey: vi.fn(),
    subscribeAppSettingByKey: vi.fn(),
  })
);

vi.mock('@/services/appSettingsApi', () => ({
  fetchAppSettingValueByKey: (...a: unknown[]) =>
    fetchAppSettingValueByKey(...a),
  subscribeAppSettingByKey: (...a: unknown[]) => subscribeAppSettingByKey(...a),
}));

import { useMaintenanceMode } from './useMaintenanceMode';

describe('useMaintenanceMode', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fetchAppSettingValueByKey.mockReset();
    subscribeAppSettingByKey.mockReset();
    subscribeAppSettingByKey.mockReturnValue(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts in loading state and hydrates after the 2 s defer', async () => {
    fetchAppSettingValueByKey.mockResolvedValue({
      maintenanceMode: true,
      maintenanceMessage: 'Back soon',
      maintenanceReturnTime: '2030-01-01',
    });

    const { result } = renderHook(() => useMaintenanceMode());
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isMaintenanceMode).toBe(true);
    expect(result.current.maintenanceMessage).toBe('Back soon');
  });

  it('falls back to defaults when no setting exists', async () => {
    fetchAppSettingValueByKey.mockResolvedValue(null);

    const { result } = renderHook(() => useMaintenanceMode());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isMaintenanceMode).toBe(false);
    expect(result.current.maintenanceMessage).toBeNull();
  });

  it('subscribes to realtime updates after the 5 s defer', async () => {
    fetchAppSettingValueByKey.mockResolvedValue({ maintenanceMode: false });

    renderHook(() => useMaintenanceMode());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5100);
    });

    expect(subscribeAppSettingByKey).toHaveBeenCalled();
    expect(subscribeAppSettingByKey.mock.calls[0][0]).toBe('display_settings');
  });
});
