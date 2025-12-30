import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DisplaySettings {
  maintenanceMode?: boolean;
  showOutOfStock?: boolean;
  enableReviews?: boolean;
  showPrices?: boolean;
}

export const useMaintenanceMode = () => {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkMaintenanceMode = async () => {
      try {
        console.log('Checking maintenance mode...');
        const { data, error } = await supabase
          .from('app_settings')
          .select('setting_value')
          .eq('setting_key', 'display_settings')
          .maybeSingle();

        console.log('Maintenance mode data:', data, 'error:', error);

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking maintenance mode:', error);
        }

        if (data?.setting_value) {
          const settings = data.setting_value as unknown as DisplaySettings;
          console.log('Maintenance mode setting:', settings?.maintenanceMode);
          setIsMaintenanceMode(settings?.maintenanceMode ?? false);
        }
      } catch (error) {
        console.error('Error checking maintenance mode:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkMaintenanceMode();

    // Subscribe to changes
    const channel = supabase
      .channel('maintenance-mode')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_settings',
          filter: 'setting_key=eq.display_settings'
        },
        (payload) => {
          if (payload.new && 'setting_value' in payload.new) {
            const settings = payload.new.setting_value as unknown as DisplaySettings;
            setIsMaintenanceMode(settings?.maintenanceMode ?? false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { isMaintenanceMode, isLoading };
};
