

## Goal

Replace the broken anon-query + fallback path on `/order-confirmation` with a strict, signed token flow. No fallback, no snapshot, no polling. Hard error state if anything is missing.

## Architecture

```text
Browser (/order-confirmation?order_id=…)
   │
   │ 1. POST { order_id }
   ▼
sign-order-token (NEW, public)
   • Verify order exists (service role)
   • Sign HMAC token: { order_id, type: "order_access", exp: now+15min }
   ◄─── { token }
   │
   │ 2. POST { token }
   ▼
get-order-by-token (NEW, public)
   • verifyToken(token)
   • assert payload.type === "order_access"
   • assert payload.exp > now
   • Service-role fetch orders + order_items
   ◄─── { order, items }
   │
   ▼
Render OrderSuccess (real data) — or HARD ERROR UI
```

Key change vs prior plan: token issuance is **independent** of `reconcile-payment`. Any browser landing on `/order-confirmation?order_id=…` can request a short-lived token by `order_id` alone (the order_id itself is the unguessable UUID; token is short-lived and scoped). No `guest_id` matching, no auth required.

## Backend Changes

### 1. Update `supabase/functions/_shared/invoice/token.ts`
- Add typed payload: `{ order_id, type: 'order_access' | 'invoice_access', exp }`.
- New `signOrderToken(order_id)` → 15-minute TTL, type `order_access`.
- Keep existing `signToken` (invoice, 30 days, type `invoice_access`) for backward compat.
- `verifyToken` now returns `{ order_id, type, exp }` (callers assert type).

### 2. NEW `supabase/functions/sign-order-token/index.ts`
- Public, CORS, `verify_jwt = false`.
- Body: `{ order_id }`.
- Service-role verifies order exists (`maybeSingle`); 404 if not.
- Returns `{ token }` (15-min, type `order_access`).
- No auth/guest checks — order_id UUID is the secret; token is short-lived.

### 3. NEW `supabase/functions/get-order-by-token/index.ts`
- Public, CORS, `verify_jwt = false`.
- Body: `{ token }`.
- `verifyToken(token)` → assert `type === 'order_access'` and `exp > now` (verifyToken already checks exp; double-asserted for clarity). 401 on failure.
- Service-role SELECT:
  - `orders`: id, status, order_status, amount, currency, created_at, shipping_address, metadata, payment_method, user_id
  - `order_items`: quantity, unit_price, total_price, product_snapshot, product_id
- 404 if order missing.
- Returns `{ order, items }`. No defaults, no synthetic data.

### 4. `supabase/config.toml`
```toml
[functions.sign-order-token]
verify_jwt = false

[functions.get-order-by-token]
verify_jwt = false
```

### 5. Tests `supabase/functions/get-order-by-token/index_test.ts`
Deno tests (using `_shared/invoice/token.ts` directly + mocked service client where feasible):
1. Valid token → 200 + `{ order, items }`
2. Malformed/invalid signature → 401
3. Expired token (exp in past) → 401
4. Wrong type (`invoice_access`) → 401
5. Missing order → 404
6. Order with zero items → 200 (frontend enforces empty-items error; backend returns truth)

## Frontend Changes

### 6. `src/lib/invoice/generateInvoice.ts`
Add helpers:
- `requestOrderToken(orderId)` → POST `/sign-order-token`, returns `{ token }`.
- `fetchOrderByToken(token)` → POST `/get-order-by-token`, returns `{ order, items }`. Throws `InvoiceError` on non-200.

### 7. `src/pages/OrderConfirmation.tsx` — full refactor
Remove:
- `fetchOrder`, `fetchOrderItems` (all anon `supabase.from('orders'/'order_items')` reads)
- `pollForOrder`, "late items" retry effect
- `OrderFallback` component path entirely
- `loadSnapshot` / `CheckoutSnapshot` usage in success/error rendering
- Any mention of "Détails en cours de synchronisation"

New flow on mount (when `order_id` present):
1. (Stripe branch) call `reconcile-payment` if needed to flip status — ignore its body.
2. `requestOrderToken(orderId)` → token
3. `fetchOrderByToken(token)` → `{ order, items }`
4. Validate strictly:
   - `order && Number(order.amount) > 0 && items.length > 0` → `setState('success')`
   - else → `setState('error')` + `console.error('[OrderConfirmation] CRITICAL', { reason })`
5. Render `<OrderSuccess order={order} items={items} />` using `Number(order.amount)` directly (Euros, no `/100`).

PayPal branch: same — after `verify-paypal-payment` resolves, follow steps 2–5.

### 8. Explicit Error UI
New `<OrderError />` block (inline in `OrderConfirmation.tsx`):
- Icon + heading "Impossible d'afficher la commande"
- Body: "Nous n'avons pas pu charger les détails de cette commande. Si vous avez été débité, contactez le support."
- CTA: "Contacter le support" (mailto) + "Retour à l'accueil"
- No retry-with-fallback. No snapshot. Hard stop.

## Out of Scope
- Invoice page (`/invoice/:id`) — already correct
- Stripe webhook, payment creation, DB schema — untouched
- Authenticated `/orders` history page — uses RLS via `user_id`, fine

## Files Touched
- NEW `supabase/functions/sign-order-token/index.ts`
- NEW `supabase/functions/get-order-by-token/index.ts`
- NEW `supabase/functions/get-order-by-token/index_test.ts`
- EDIT `supabase/functions/_shared/invoice/token.ts` (add typed payload + `signOrderToken`)
- EDIT `supabase/config.toml` (two new function entries)
- EDIT `src/lib/invoice/generateInvoice.ts` (add `requestOrderToken`, `fetchOrderByToken`)
- EDIT `src/pages/OrderConfirmation.tsx` (remove fallback/polling/snapshot; token flow + error UI)

