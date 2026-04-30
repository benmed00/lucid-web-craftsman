/**
 * Golden fixture compatibility for pricing_snapshot v1 (DB shape ↔ SPA Zod).
 *
 * Prerequisites: Deno 2; `--allow-read` for `fixtures/` + import map (`deno.json`).
 * Run one focused file: `deno test --allow-env --allow-read=. --no-check --config supabase/functions/deno.json supabase/functions/_shared/pricing_snapshot_golden_test.ts`
 */
import { assertEquals } from 'https://deno.land/std@0.190.0/testing/asserts.ts';

import { pricingSnapshotV1Schema } from '../../../src/lib/checkout/pricingSnapshotSchema.ts';

const goldenUrl = new URL(
  './fixtures/pricing_snapshot_v1.golden.json',
  import.meta.url
);

Deno.test(
  'golden pricing_snapshot_v1.json accepts SPA Zod schema',
  async () => {
    const raw = JSON.parse(await Deno.readTextFile(goldenUrl));
    const parsed = pricingSnapshotV1Schema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(JSON.stringify(parsed.error.flatten(), null, 2));
    }
    assertEquals(parsed.data.version, 1);
    assertEquals(parsed.data.currency, 'eur');
    assertEquals(parsed.data.lines.length, 2);
  }
);
