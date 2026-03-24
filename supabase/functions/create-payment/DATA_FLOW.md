# Create-payment — data flow, mapping, and audit

This document describes how payloads move through the edge function, how types line up, and known operational tradeoffs. The entrypoint is `index.ts`; tests live in `lib/*_test.ts`.

**Configuration & HTTP surface constants** (CORS allow-headers, rate limits, max cart items, Stripe min/shipping cents, origin allowlist, `CHECKOUT_VALIDATION_ERROR_PREFIX`): [`constants.ts`](./constants.ts).

## Visual reference (graphs)

Short atlas of **needs**, **behaviour**, **functional stages**, **module ties**, and **shape evolution**. Diagrams are [Mermaid](https://mermaid.js.org/); they render on GitHub and in many IDEs.

### 1. Needs & stakeholders (mindmap)

What the function must satisfy and for whom.

```mermaid
mindmap
  root((create-payment))
    Buyer
      Valid Stripe Checkout URL
      Totals match server prices
      Shipping/discount rules applied fairly
    Store / ops
      Pending order row before redirect
      order_items snapshots for fulfilment
      payment_events for audits
    Security
      CSRF on state-changing POST
      Rate limit payment spam
      No trusting client unit prices
    Platform
      Service role DB access only here
      Correlation ids in metadata
      CORS allowlist for browser invoke
```

### 2. Behaviour — guard rails then work (flowchart)

Order of checks and main success path (simplified; see sequence diagram below for IO detail).

```mermaid
flowchart TB
  START([POST /create-payment]) --> OPT{OPTIONS preflight?}
  OPT -->|yes| CORS[CORS headers from constants]
  OPT -->|no| RL{Rate limit OK?}
  RL -->|no| E429[429 French message]
  RL -->|yes| CSRF{CSRF headers valid?}
  CSRF -->|no| E403[403]
  CSRF -->|yes| BODY[Parse JSON + Zod schema]
  BODY -->|invalid| E422a[422 client-facing validation]
  BODY -->|ok| VERIFY[Fetch products verify cart lines]
  VERIFY -->|stock/product issue| E422b[422 French business rules]
  VERIFY -->|ok| COUPON[Resolve coupon from DB if code]
  COUPON --> AMOUNTS[Compute cents line_items discount cap]
  AMOUNTS --> INSERT[Insert orders + order_items]
  INSERT -->|failure| E500a[500 internal]
  INSERT -->|ok| STRIPE[checkout.sessions.create]
  STRIPE -->|failure| E500b[500 + payment_initiation_failed log]
  STRIPE -->|ok| PATCH[Update order stripe_session_id]
  PATCH --> OK[200 JSON with session url]
```

### 3. Functionalities by layer (block view)

```mermaid
flowchart LR
  subgraph ingress["Ingress"]
    A1[CORS]
    A2[Rate limit]
    A3[CSRF / security]
  end
  subgraph domain["Domain"]
    B1[Zod parse]
    B2[Verified cart]
    B3[Discount + amounts]
    B4[Stripe session build]
  end
  subgraph persistence["Persistence"]
    C1[orders]
    C2[order_items]
    C3[payment_events log]
  end
  subgraph external["External"]
    D1[Stripe API]
  end
  ingress --> domain
  domain --> persistence
  domain --> D1
  persistence --> D1
```

### 4. Data flow — type / shape handoffs

Mirrors the **Data transfer: wire → domain → persistence** table below; shows **trust boundary**: prices become authoritative only after product rows load.

```mermaid
flowchart LR
  HTTP["HTTP body unknown"] --> ZOD["ParsedCheckoutRequest"]
  ZOD --> VC["VerifiedCartItem[]"]
  VC --> LI["Stripe line_items cents"]
  VC --> OR["orders insert"]
  VC --> OI["order_items + product_snapshot JSON"]
  LI --> SESS["Stripe Checkout Session"]
  SESS --> URL["url returned to client"]
```

### 5. Ties — orchestrator imports (`index.ts` → modules)

Direct imports from the Edge entrypoint (runtime order is inside `serve()`, not this star).

```mermaid
flowchart TB
  IDX["index.ts serve"]
  IDX --> CST["constants.ts"]
  IDX --> TYP["types.ts"]
  IDX --> SCH["lib/checkout-schema.ts"]
  IDX --> RL["lib/rate-limit.ts"]
  IDX --> SEC["lib/security.ts"]
  IDX --> VC["lib/verified-cart.ts"]
  IDX --> DIS["lib/discount.ts"]
  IDX --> AMT["lib/amounts.ts"]
  IDX --> SS["lib/stripe-session.ts"]
  IDX --> ORD["lib/orders.ts"]
  IDX --> PE["lib/payment-events.ts"]
  IDX --> SC["lib/stripe-client.ts"]
  IDX --> STRCUS["lib/stripe-customer.ts"]
  IDX --> AU["lib/auth-user.ts"]
  IDX --> ERR["lib/errors.ts"]
```

**Typical runtime chain inside the handler** (simplified): `parseCheckoutRequestBody` → `fetchProductsForCart` / `buildVerifiedCartItems` → `resolveServerDiscount` → `buildStripeCheckoutLineItems` / caps → `insertPaymentPendingOrder` + line items → `buildCheckoutSessionCreateParams` → Stripe `checkout.sessions.create` → order patch + logging.

### 6. Errors → HTTP surface

Maps to the **Error management** table below; central logic in `lib/errors.ts`.

```mermaid
flowchart LR
  subgraph out["Response"]
    R429[429]
    R403[403]
    R422[422]
    R500[500]
  end
  subgraph cause["Typical cause"]
    C429["checkRateLimit"]
    C403["CSRF mismatch"]
    C422["Zod / email / stock / product"]
    C500["Postgres Stripe uncaught"]
  end
  C429 --> R429
  C403 --> R403
  C422 --> R422
  C500 --> R500
```

## End-to-end flow (happy path)

```mermaid
sequenceDiagram
  participant Client
  participant Edge as create-payment
  participant DB as Supabase
  participant Stripe

  Client->>Edge: POST JSON + CSRF headers
  Edge->>Edge: parseCheckoutRequestBody (Zod)
  Edge->>DB: products by id (service role)
  Edge->>Edge: buildVerifiedCartItems
  Edge->>DB: discount_coupons (if code)
  Edge->>Edge: amounts + line_items
  Edge->>DB: orders + order_items
  Edge->>Stripe: checkout.sessions.create
  Edge->>DB: orders update stripe_session_id
  Edge->>Client: { url }
```

## Data transfer: wire → domain → persistence

| Stage             | Shape                       | Notes                                                                                  |
| ----------------- | --------------------------- | -------------------------------------------------------------------------------------- |
| HTTP body         | `unknown`                   | Parsed immediately; never trusted for prices.                                          |
| After Zod         | `ParsedCheckoutRequest`     | Top-level unknown keys stripped; `items` strict; nested objects `.passthrough()`.      |
| Cart verification | `VerifiedCartItem[]`        | Prices/names from `products` table; client `product.price` only logged if mismatched.  |
| Stripe            | `CheckoutSessionLineItem[]` | `unit_amount` in **cents**; proportional discount per line; shipping line if not free. |
| Order row         | `orders` insert             | `amount` = **total cents**; `shipping_address` = `ShippingAddressPayload \| null`.     |
| Line snapshots    | `order_items`               | `OrderItemInsert` includes `product_snapshot` JSON from `VerifiedProductSnapshot`.     |

## Type synergy

- **`CheckoutRequestBody`** (`types.ts`): loose documentation of client JSON; handlers that accept post-parse data should prefer **`ParsedCheckoutRequest`** where possible.
- **`CheckoutCartItem`**: aligns with Zod output; used by `verified-cart` and `collectProductIds`.
- **`VerifiedCartItem`**: single source of truth for totals and Stripe lines until session creation.
- **`SupabaseClient`** without generated `Database`: list/mutation results use `SupabaseListResult` / `SupabaseMutationResult` in `types.ts` where casts are unavoidable.

## Error management

| Layer               | Mechanism                                                              | HTTP                                              |
| ------------------- | ---------------------------------------------------------------------- | ------------------------------------------------- |
| Rate limit          | `checkRateLimit`                                                       | **429** + French message (not JSON `error_type`). |
| CSRF                | Missing/invalid headers                                                | **403**                                           |
| Body schema         | `parseCheckoutRequestBody` throws `CHECKOUT_VALIDATION_ERROR_PREFIX …` | **422** via `isClientFacingValidationError`       |
| Email               | `isValidEmail`                                                         | **422** (`Invalid` substring)                     |
| Stock / product     | French messages (`introuvable`, etc.)                                  | **422**                                           |
| DB / Stripe / other | `catch`                                                                | **500**, `error_type: internal`                   |

Central mapping: `lib/errors.ts` (`messageFromUnknownError`, `isClientFacingValidationError`). Payment failures are logged with `createPaymentEventLogger` (`payment_initiation_failed`).

## Audit (current strengths / gaps)

**Strengths**

- Server-side price verification; discount recomputed from DB coupon.
- CSRF + rate limit before heavy work.
- Correlation id in order metadata and Stripe metadata.
- Pure helpers covered by Deno tests (`*_test.ts`).
- **CI:** `.github/workflows/deno-create-payment.yml` on the same branches as root CI (frozen lockfile on check + test).

**Gaps / follow-ups**

- Rate limit is in-memory per isolate (resets on cold start; not shared across instances).
- `isClientFacingValidationError` uses substring heuristics; tighten with typed error codes if clients need stable machine-readable codes.
- No generated `Database` generic on `createClient` yet (see `REFACTOR_PLAN.md` Phase 6).
- Order update after Stripe session creation is not in the same transaction as inserts (eventual consistency risk on partial failure).

## CI and lockfile

- **GitHub Actions:** `.github/workflows/deno-create-payment.yml` runs on **push** and **pull_request** for the same branch allowlist as `.github/workflows/ci.yml`. `deno check` and `deno test` use **`--lock supabase/functions/deno.lock --frozen`** so dependency drift fails the build until the lockfile is updated and committed. `deno lint` does not take `--lock` in Deno 2.x; it still uses `--config deno.json` for import maps.
- **Local parity before a PR:** `npm run verify:create-payment` from the repo root.
- **After changing `deno.json` imports or versions:** from `supabase/functions`, run `deno test create-payment/ --config deno.json` (or `deno cache create-payment/index.ts --config deno.json`) to refresh `deno.lock`, then commit the lockfile.

## Manual smoke (not in CI)

- Full **HTTP** checkout still needs a real CSRF triple, optional auth, and Supabase/Stripe secrets — run against staging or `supabase functions serve` with env vars. Track **422 vs 500** rates and `payment_initiation_failed` after deploys.

## Feedback for maintainers

- When changing Zod rules, update `lib/checkout-schema_test.ts` and this table.
- When adding new client fields, prefer `.passthrough()` on nested objects unless you need strict validation.
- Quick tests from repo root: `npm run test:create-payment`. Stricter pre-PR gate: `npm run verify:create-payment`.

## See also

- SPA behavior after redirect (polling, elevated storefront, service worker): [`docs/PLATFORM.md`](../../../docs/PLATFORM.md).
- Doc index: [`docs/README.md`](../../../docs/README.md).
