/**
 * Internal (service-role) sends should prefer `orders.pricing_snapshot` so the email
 * matches Stripe and the confirmation page — body line totals are ignored when v1 snapshot exists.
 */

export type OrderItemForEmail = {
  name: string;
  quantity: number;
  price: number;
  image?: string;
  productId?: number;
};

type SnapshotLine = {
  description: string;
  quantity: number;
  unit_minor: number;
  line_total_minor: number;
};

export type PricingSnapshotV1 = {
  version: 1;
  currency: string;
  subtotal_minor: number;
  discount_minor: number;
  shipping_minor: number;
  total_minor: number;
  lines: SnapshotLine[];
};

export type DbOrderItemRow = {
  product_id: number;
  quantity: number;
  product_snapshot?: { name?: string; images?: string[] } | null;
};

export function isPricingSnapshotV1(row: unknown): row is PricingSnapshotV1 {
  if (typeof row !== 'object' || row === null) return false;
  const o = row as Record<string, unknown>;
  return (
    o.version === 1 &&
    typeof o.currency === 'string' &&
    typeof o.subtotal_minor === 'number' &&
    typeof o.discount_minor === 'number' &&
    typeof o.shipping_minor === 'number' &&
    typeof o.total_minor === 'number' &&
    Array.isArray(o.lines)
  );
}

import { isShippingLineDescription } from '../../_shared/pricing-snapshot.ts';

export { isShippingLineDescription };

export function buildEmailPricingFromSnapshot(
  snap: PricingSnapshotV1,
  orderItems: DbOrderItemRow[]
): {
  items: OrderItemForEmail[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  currency: string;
} {
  const productLines = snap.lines.filter(
    (l) => !isShippingLineDescription(l.description)
  );
  const items: OrderItemForEmail[] = productLines.map((line, i) => {
    const oi = orderItems[i];
    const img = oi?.product_snapshot?.images?.[0];
    return {
      name: line.description,
      quantity: line.quantity,
      price: line.unit_minor / 100,
      image: img,
      productId: oi?.product_id,
    };
  });
  return {
    items,
    subtotal: snap.subtotal_minor / 100,
    discount: snap.discount_minor / 100,
    shipping: snap.shipping_minor / 100,
    total: snap.total_minor / 100,
    currency: snap.currency.toUpperCase(),
  };
}

export function shippingAddressFromOrderRow(raw: unknown): {
  address: string;
  city: string;
  postalCode: string;
  country: string;
} | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const sa = raw as Record<string, unknown>;
  const country =
    sa.country === 'FR' ? 'France' : String(sa.country || 'France');
  return {
    address: String(sa.address_line1 || ''),
    city: String(sa.city || ''),
    postalCode: String(sa.postal_code || ''),
    country,
  };
}
