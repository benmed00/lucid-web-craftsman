import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AB_SESSION_KEY } from '@/lib/abThemeConstants';
import { useUIStyleStore, type UIStyle } from '@/stores/uiStyleStore';

interface ABThemeTest {
  id: string;
  is_active: boolean;
  variant_a: string;
  variant_b: string;
  split_percentage: number;
}

/**
 * Assigns visitor to A/B variant and applies the theme.
 * - Checks DB for active test
 * - Assigns variant (sticky per session via sessionStorage)
 * - Applies the theme via uiStyleStore
 * - Tracks page view once per session
 *
 * Only runs on storefront (non-admin) pages.
 */
export function useABThemeTest() {
  const setUIStyle = useUIStyleStore((s) => s.setUIStyle);
  const viewTracked = useRef(false);

  const { data: activeTest } = useQuery<ABThemeTest | null>({
    queryKey: ['ab-theme-test-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ab_theme_tests')
        .select('id, is_active, variant_a, variant_b, split_percentage')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      if (error || !data) return null;
      return data as ABThemeTest;
    },
    staleTime: 5 * 60 * 1000, // 5 min
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!activeTest) return;

    // Determine or retrieve sticky variant
    let variant: 'a' | 'b';
    const stored = sessionStorage.getItem(AB_SESSION_KEY);
    if (stored === 'a' || stored === 'b') {
      variant = stored;
    } else {
      variant = Math.random() * 100 < activeTest.split_percentage ? 'a' : 'b';
      try {
        sessionStorage.setItem(AB_SESSION_KEY, variant);
      } catch {
        /* private mode */
      }
    }

    // Apply theme
    const theme = (
      variant === 'a' ? activeTest.variant_a : activeTest.variant_b
    ) as UIStyle;
    setUIStyle(theme);

    // Track view once per session
    if (!viewTracked.current) {
      viewTracked.current = true;
      supabase
        .rpc('increment_ab_counter', {
          test_id: activeTest.id,
          variant,
          counter_type: 'view',
        })
        .then(/* fire-and-forget */);
    }
  }, [activeTest, setUIStyle]);

  return {
    activeTest,
    variant: (typeof window !== 'undefined'
      ? sessionStorage.getItem(AB_SESSION_KEY)
      : null) as 'a' | 'b' | null,
  };
}
