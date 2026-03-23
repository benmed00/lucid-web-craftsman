/**
 * Maintenance Mode Hook
 * Checks and subscribes to maintenance mode status
 */

import { useState, useEffect, useCallback } from 'react';
import {
  fetchAppSettingValueByKey,
  subscribeAppSettingByKey,
} from '@/services/appSettingsApi';
import { handleError } from '@/lib/errors/AppError';

interface DisplaySettings {
  maintenanceMode?: boolean;
  maintenanceReturnTime?: string;
  maintenanceMessage?: string;
  showOutOfStock?: boolean;
  enableReviews?: boolean;
  showPrices?: boolean;
}

interface MaintenanceModeState {
  isMaintenanceMode: boolean;
  maintenanceReturnTime: string | null;
  maintenanceMessage: string | null;
  isLoading: boolean;
}

const SETTINGS_KEY = 'display_settings';

export const useMaintenanceMode = (): MaintenanceModeState => {
  const [state, setState] = useState<MaintenanceModeState>({
    isMaintenanceMode: false,
    maintenanceReturnTime: null,
    maintenanceMessage: null,
    isLoading: true,
  });

  const updateFromSettings = useCallback((settings: DisplaySettings | null) => {
    setState((prev) => ({
      ...prev,
      isMaintenanceMode: settings?.maintenanceMode ?? false,
      maintenanceReturnTime: settings?.maintenanceReturnTime ?? null,
      maintenanceMessage: settings?.maintenanceMessage ?? null,
    }));
  }, []);

  useEffect(() => {
    let isMounted = true;

    // Defer maintenance check by 2s to avoid competing with critical
    // product queries for Chrome's 6-connection-per-host limit.
    const deferTimer = setTimeout(async () => {
      try {
        const settingValue = await fetchAppSettingValueByKey(SETTINGS_KEY);

        if (!isMounted) return;

        if (settingValue) {
          const settings = settingValue as unknown as DisplaySettings;
          updateFromSettings(settings);
        }
      } catch (error) {
        handleError(error, 'useMaintenanceMode.checkMaintenanceMode');
      } finally {
        if (isMounted) {
          setState((prev) => ({ ...prev, isLoading: false }));
        }
      }
    }, 2000);

    let unsubscribeRealtime: (() => void) | null = null;
    const realtimeTimer = setTimeout(() => {
      if (!isMounted) return;
      unsubscribeRealtime = subscribeAppSettingByKey(SETTINGS_KEY, (value) => {
        if (!isMounted || value == null) return;
        updateFromSettings(value as unknown as DisplaySettings);
      });
    }, 5000);

    return () => {
      isMounted = false;
      clearTimeout(deferTimer);
      clearTimeout(realtimeTimer);
      unsubscribeRealtime?.();
    };
  }, [updateFromSettings]);

  return state;
};
