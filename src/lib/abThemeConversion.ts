/**
 * A/B theme conversion tracking (Supabase).
 *
 * Records funnel events for the active theme test: `add_to_cart` and `checkout` counters
 * via `increment_ab_counter`. Variant is read from `sessionStorage` (`AB_SESSION_KEY`), set by
 * `useABThemeTest` when an active row exists in `ab_theme_tests` (see `src/hooks/useABThemeTest.ts`).
 *
 * @module abThemeConversion
 * @see `src/lib/abThemeConstants.ts` — `AB_SESSION_KEY`
 * @see `src/hooks/useABThemeTest.ts` — assigns variant and tracks `view`
 * @remarks If no variant is stored, or no active test row is found, calls are no-ops. Uses the
 * first active test (`limit(1)`), consistent with the hook’s active-test query.
 */

import { supabase } from '@/integrations/supabase/client';
import { AB_SESSION_KEY } from '@/lib/abThemeConstants';

/** Conversion funnel step sent to `increment_ab_counter` (distinct from `view`). */
export type ABConversionType = 'add_to_cart' | 'checkout';

/**
 * Increments the add-to-cart or checkout counter for the visitor’s A/B variant on the active test.
 * Does nothing when the session has no assigned variant or when there is no active test.
 */
export async function trackABConversion(counterType: ABConversionType) {
  const variant = sessionStorage.getItem(AB_SESSION_KEY) as 'a' | 'b' | null;
  if (!variant) return;

  const { data } = await supabase
    .from('ab_theme_tests')
    .select('id')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (data?.id) {
    await supabase.rpc('increment_ab_counter', {
      test_id: data.id,
      variant,
      counter_type: counterType,
    });
  }
}
