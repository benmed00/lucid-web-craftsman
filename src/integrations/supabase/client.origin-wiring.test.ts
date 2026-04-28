import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

/**
 * Ensures the Supabase JS client does not reintroduce a second URL resolution
 * path (the historical invoice vs REST split-brain bug).
 */
describe('client.ts uses resolveSupabaseOrigin', () => {
  it('wires createClient to the canonical resolver export', () => {
    const path = join(process.cwd(), 'src/integrations/supabase/client.ts');
    const src = readFileSync(path, 'utf8');
    expect(src).toContain("from './resolveSupabaseOrigin'");
    expect(src).toContain(
      'export const resolvedSupabaseUrl = resolveSupabaseOrigin()'
    );
    expect(src).toMatch(/createClient[\s\S]*?resolvedSupabaseUrl/s);
  });
});
