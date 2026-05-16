# Client hints vs server-enforced rules

Short checklist for storefront logic: what the **browser may assume** for UX, and what **must** stay authoritative on **Edge functions**, **Postgres (RLS / constraints)**, or **Stripe/webhooks**.

## Principles

1. **Money and inventory**: amounts, discounts, tax/shipping lines, stock commits, and payment-session creation are **server-enforced**. The SPA computes totals for display and sends structured payloads; **`create-payment`** (and related functions) re-verify cart, coupons, and limits.
2. **Identity and authorization**: the SPA uses the publishable key and session hints; **RLS** and Edge checks decide what rows or actions are allowed.
3. **Configurable knobs** (`BusinessRules`, `app_settings`): merged on the client for **early feedback** (toasts, disabling buttons); sensitive thresholds are **re-checked server-side** where documented (see [BUSINESS_LOGIC_AND_EDGE_CASES.md](./BUSINESS_LOGIC_AND_EDGE_CASES.md)).
4. **Validation**: Zod/sanitization in **`src/utils/checkoutValidation.ts`** and related modules reduce garbage and XSS risk; they are **not** a substitute for Edge validation.

## Quick reference

| Area              | Client role                         | Server / DB authority                                      |
| ----------------- | ----------------------------------- | ---------------------------------------------------------- |
| Order totals      | Display, snapshot for confirmation  | Edge recomputes from DB-backed cart + coupon rules         |
| Min/max cart EUR  | Block pay + toast (`BusinessRules`) | Edge / business logic must reject out-of-range submissions |
| Promo codes       | RPC validation + UI messaging      | Coupon validity, limits, amounts on Edge                   |
| Stock             | `reserveStock` before pay session   | Fulfillment / webhook paths; DB stock                      |
| Guest vs auth     | Session IDs in headers/body         | Edge validates guest token / user                          |
| CSRF              | Header from `useCsrfToken`          | Edge verifies                                              |

## Where to go deeper

- Behavioral catalog: [BUSINESS_LOGIC_AND_EDGE_CASES.md](./BUSINESS_LOGIC_AND_EDGE_CASES.md)
- Rule index (links only): [RULES_REGISTRY.md](./RULES_REGISTRY.md)
- SPA layering: [src/services/README.md](../src/services/README.md), [TECH_DEBT.md](./TECH_DEBT.md) (Supabase import policy)
