/**
 * Vitest: Zod schema for persisted pricing_snapshot v1 (aligned with Deno golden fixture).
 *
 * Prerequisites: none (fixtures read from repo root).
 * Run: `npm run test:pricing-snapshot` or `npx vitest run src/lib/checkout/pricingSnapshot.test.ts`
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { pricingSnapshotV1Schema } from './pricingSnapshotSchema';

describe('pricingSnapshotV1Schema', () => {
  it('accepts a v1 Stripe-shaped snapshot', () => {
    const raw = {
      version: 1,
      currency: 'eur',
      source: 'stripe_checkout_session',
      stripe_session_id: 'cs_x',
      subtotal_minor: 6200,
      discount_minor: 100,
      shipping_minor: 0,
      tax_minor: 0,
      total_minor: 6100,
      lines: [
        {
          description: 'Item',
          quantity: 1,
          unit_minor: 6100,
          line_total_minor: 6100,
        },
      ],
      finalized_at: new Date().toISOString(),
    };
    const r = pricingSnapshotV1Schema.safeParse(raw);
    expect(r.success).toBe(true);
  });

  it('accepts golden fixture JSON (same file as Deno golden test)', () => {
    const path = resolve(
      process.cwd(),
      'supabase/functions/_shared/fixtures/pricing_snapshot_v1.golden.json'
    );
    const raw = JSON.parse(readFileSync(path, 'utf8')) as unknown;
    const r = pricingSnapshotV1Schema.safeParse(raw);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.stripe_session_id).toBe('cs_golden_fixture_anonymized');
      expect(r.data.lines).toHaveLength(2);
    }
  });
});
