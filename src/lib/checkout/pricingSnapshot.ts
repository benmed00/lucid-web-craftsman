import {
  pricingSnapshotV1Schema,
  pricingLineV1Schema,
  type PricingSnapshotV1,
} from './pricingSnapshotSchema';

export { pricingSnapshotV1Schema, pricingLineV1Schema, type PricingSnapshotV1 };

/** SPA-side detection — keep keywords aligned with `isShippingLineDescription` in `supabase/functions/_shared/pricing-snapshot.ts`. */
export function isSnapshotShippingLine(description: string): boolean {
  const d = description.toLowerCase();
  return (
    d.includes('frais de livraison') ||
    d.includes('livraison standard') ||
    d === 'shipping' ||
    d.includes('shipping') ||
    d.includes('delivery') ||
    d.includes('envío') ||
    d.includes('envio') ||
    d.includes('spedizione') ||
    d.includes('versand')
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
