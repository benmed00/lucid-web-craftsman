# Pricing Snapshot Contract

The `orders.pricing_snapshot` JSONB column is the **authoritative, immutable
record of money for a paid order**. It is built from Stripe (Checkout Session

- line items) and persisted by every confirmation path (`stripe-webhook`,
  `verify-payment`, `reconcile-payment`) so the email, SPA order confirmation,
  invoice, and admin OMS all read the exact same numbers regardless of which
  path confirmed the order.

This document defines the contract and the rules for evolving it without
breaking existing rows.

---

## Source of truth

- **Code:** [`supabase/functions/_shared/pricing-snapshot.ts`](./pricing-snapshot.ts)
  — `buildPricingSnapshotV1FromStripe(session, lineItems)` + types.
- **Persistence:** [`supabase/functions/_shared/persist-pricing-snapshot.ts`](./persist-pricing-snapshot.ts)
  — single helper called after `confirmOrderFromStripe`. Failures are
  non-fatal but audited as `pricing_snapshot_persist_failed` in `payment_events`.
- **Mirror:** [`supabase/functions/stripe-webhook/lib/pricing-snapshot.ts`](../stripe-webhook/lib/pricing-snapshot.ts)
  — `export *` from the shared module so the webhook keeps its existing import
  path. Do **not** add divergent logic here.
- **SPA validator:** [`src/lib/checkout/pricingSnapshot.ts`](../../../src/lib/checkout/pricingSnapshot.ts)
  — Zod schema + `logPricingConsistency` (warns when DB `total_amount`
  diverges from `pricing_snapshot.total_minor`).

## Tests

- Deno (server, authoritative shape):
  - `supabase/functions/_shared/pricing-snapshot_test.ts`
  - `supabase/functions/_shared/pricing_snapshot_golden_test.ts` — fixture JSON `fixtures/pricing_snapshot_v1.golden.json` + schéma Zod (`src/lib/checkout/pricingSnapshotSchema.ts`)
  - `supabase/functions/_shared/pricing_snapshot_extended_test.ts` — JPY, fixture Stripe anonymisée, volumétrie
  - `supabase/functions/_shared/persist-pricing-snapshot_test.ts` — `persistPricingSnapshot` avec mocks
  - `supabase/functions/stripe-webhook/lib/pricing-snapshot_test.ts`
  - `supabase/functions/send-order-confirmation/_lib/email-pricing-from-db_test.ts`
- Vitest (SPA Zod schema): `src/lib/checkout/pricingSnapshot.test.ts`
- Combined script: `pnpm run test:pricing-snapshot`

---

## v1 schema (current)

```ts
type PricingSnapshotV1 = {
  version: 1; // discriminator
  currency: string; // ISO-4217 lowercase, e.g. "eur"
  source: 'stripe_checkout_session'; // only allowed source today
  stripe_session_id: string; // cs_...
  // All amounts are in **minor units** (cents for EUR), matching Stripe.
  subtotal_minor: number; // session.amount_subtotal
  discount_minor: number; // total_details.amount_discount ?? 0
  shipping_minor: number; // total_details.amount_shipping ?? 0
  tax_minor: number; // total_details.amount_tax ?? 0
  total_minor: number; // session.amount_total — authoritative
  lines: Array<{
    description: string; // trimmed; falls back to "Article"
    quantity: number;
    unit_minor: number; // round(line_total / quantity), 0-safe
    line_total_minor: number; // Stripe line_item.amount_total
  }>;
  finalized_at: string; // ISO-8601 UTC
};
```

### Invariants

1. `version` is the discriminator. Consumers MUST branch on it before
   reading any other field.
2. All money is in **minor units** (integer cents for EUR). Never mix euros.
3. Currency is **lowercase** (`'eur'`), to match Stripe API responses.
4. `total_minor === subtotal_minor − discount_minor + shipping_minor + tax_minor`
   when Stripe returns these fields. We mirror Stripe; we do not recompute.
5. Snapshots are written **once** after payment confirmation and treated as
   immutable. Re-running confirmation with the same Stripe session must
   produce an equivalent snapshot.
6. Mirror columns on `orders` (`subtotal_amount`, `discount_amount`,
   `shipping_amount`, `total_amount`, `currency`) are populated from the
   snapshot and must never disagree. The SPA logs a console error if they do.

---

## Versioning rules

The snapshot is a long-lived database artifact: rows written today must keep
working forever. Follow these rules when changing the shape.

### Backward-compatible (no version bump)

You MAY add fields without bumping `version` if **all** of these hold:

- The new field is **optional** at read time (`field?: T` in the type, and
  the SPA Zod schema marks it `.optional()`).
- Older rows that lack the field continue to validate and render correctly.
- All readers (server, SPA, email, invoice, admin) handle `undefined`
  with a safe default.

Examples that are safe today: adding `tip_minor`, `rounding_minor`, a
`metadata` bag, or extra per-line attributes.

### Breaking — requires a new version

Bump to `version: 2` (and add a discriminated union) when you:

- Rename, remove, or retype an existing field.
- Change unit semantics (e.g., switch a field from minor to major units).
- Add a new `source` whose totals are computed differently from Stripe.
- Change which field is authoritative for `total`.

When introducing v2:

1. Keep `PricingSnapshotV1` in the type union — never delete it.
2. Add `PricingSnapshotV2` with `version: 2` and a separate builder
   (`buildPricingSnapshotV2From…`).
3. Update the SPA Zod schema to a discriminated union on `version`.
4. Every reader must `switch (snap.version)` and handle both. Do not assume
   v2 shape on legacy rows.
5. Do **not** backfill or rewrite existing v1 rows. Old orders stay v1.
6. Update tests in both `_shared/pricing-snapshot_test.ts` and
   `src/lib/checkout/pricingSnapshot.test.ts` to cover both versions.
7. Update this document and the entries in
   [`supabase/functions/README.md`](../README.md).

### Never

- Never mutate a previously-written `pricing_snapshot` row in place.
- Never compute totals on the client. The snapshot is the source of truth.
- Never duplicate the builder inside a function folder; always re-export
  from `_shared/pricing-snapshot.ts` (the cross-function bundling check
  enforces this — see `scripts/check-edge-functions-bundling.mjs`).
