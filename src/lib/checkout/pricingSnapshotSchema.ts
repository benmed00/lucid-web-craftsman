import { z } from 'zod';

/** Zod schema for `orders.pricing_snapshot` v1 — kept in sync with Deno (`supabase/functions/_shared/pricing-snapshot.ts`). */
export const pricingLineV1Schema = z.object({
  description: z.string(),
  quantity: z.number(),
  unit_minor: z.number(),
  line_total_minor: z.number(),
});

export const pricingSnapshotV1Schema = z.object({
  version: z.literal(1),
  currency: z.string(),
  source: z.literal('stripe_checkout_session'),
  stripe_session_id: z.string(),
  subtotal_minor: z.number(),
  discount_minor: z.number(),
  shipping_minor: z.number(),
  tax_minor: z.number(),
  total_minor: z.number(),
  lines: z.array(pricingLineV1Schema),
  finalized_at: z.string(),
});

export type PricingSnapshotV1 = z.infer<typeof pricingSnapshotV1Schema>;
