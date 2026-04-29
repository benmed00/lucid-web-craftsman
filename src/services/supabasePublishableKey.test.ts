/**
 * Vitest (`npm run test:unit` or `npx vitest run src/services/supabasePublishableKey.test.ts`).
 * Keeps `@/services/supabasePublishableKey` aligned with `resolvedSupabasePublishableKey`
 * from the integration client (Edge `apikey` header).
 */

import { describe, it, expect } from 'vitest';
import { resolvedSupabasePublishableKey as fromService } from './supabasePublishableKey';
import { resolvedSupabasePublishableKey as fromClient } from '@/integrations/supabase/client';

describe('supabasePublishableKey', () => {
  it('re-exports the same publishable key as integrations/supabase/client', () => {
    expect(fromService).toBe(fromClient);
    expect(typeof fromService).toBe('string');
    expect(fromService.length).toBeGreaterThan(10);
  });
});
