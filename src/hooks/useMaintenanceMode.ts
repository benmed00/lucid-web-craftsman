/**
 * Maintenance Mode Hook
 * Checks and subscribes to maintenance mode status
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { handleError, DatabaseError } from '@/lib/errors/AppError';

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
        const { data, error } = await supabase
          .from('app_settings')
          .select('setting_value')
          .eq('setting_key', SETTINGS_KEY)
          .maybeSingle();

        if (!isMounted) return;

        if (error && error.code !== 'PGRST116') {
          throw new DatabaseError(
            `Failed to check maintenance mode: ${error.message}`,
            error.code
          );
        }

        if (data?.setting_value) {
          const settings = data.setting_value as unknown as DisplaySettings;
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

    // Subscribe to realtime changes (deferred — non-critical)
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const realtimeTimer = setTimeout(() => {
      if (!isMounted) return;
      channel = supabase
        .channel('maintenance-mode')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'app_settings',
            filter: `setting_key=eq.${SETTINGS_KEY}`,
          },
          (payload) => {
            if (payload.new && 'setting_value' in payload.new) {
              const settings = payload.new
                .setting_value as unknown as DisplaySettings;
              updateFromSettings(settings);
            }
          }
        )
        .subscribe();
    }, 5000);

    return () => {
      isMounted = false;
      clearTimeout(deferTimer);
      clearTimeout(realtimeTimer);
      if (channel) supabase.removeChannel(channel);
    };
  }, [updateFromSettings]);

  return state;
};
