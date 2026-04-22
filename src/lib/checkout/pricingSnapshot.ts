import { z } from 'zod';

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

export function isSnapshotShippingLine(description: string): boolean {
  const d = description.toLowerCase();
  return (
    d.includes('frais de livraison') ||
    d.includes('livraison standard') ||
    d.includes('shipping') ||
    d === 'shipping'
  );
}

/** Log when DB total_amount disagrees with snapshot (should never happen if webhook ran). */
export function logPricingConsistency(
  snapshot: PricingSnapshotV1,
  totalAmountMinorFromDb: number | null | undefined
): void {
  if (
    totalAmountMinorFromDb == null ||
    typeof totalAmountMinorFromDb !== 'number'
  ) {
    return;
  }
  if (snapshot.total_minor !== totalAmountMinorFromDb) {
    console.error(
      '[pricing] total_amount column !== pricing_snapshot.total_minor',
      {
        snapshot_total: snapshot.total_minor,
        db_total_amount: totalAmountMinorFromDb,
      }
    );
  }
}
