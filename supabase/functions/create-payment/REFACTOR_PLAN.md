# Create-payment edge function — iterative improvement plan

**Related:** wire-level flow in [`DATA_FLOW.md`](./DATA_FLOW.md); storefront checkout/payment **after** Stripe redirect in [`docs/PLATFORM.md`](../../../docs/PLATFORM.md).

This plan is designed to be **testable**, **reversible**, **stable**, and **documented**, with **short feedback loops** (retros) after each slice. Each phase should ship in its own commit (or small PR stack) so `git revert` restores the previous behaviour.

### Progress & layout (living)

| Phase | Status   | Notes                                                                                                |
| ----- | -------- | ---------------------------------------------------------------------------------------------------- |
| 0     | Done     | Plan + `AGENTS.md` pointer                                                                           |
| 1     | **Done** | `types.ts` — domain + Supabase result helpers                                                        |
| 2     | **Done** | `constants.ts` — CORS, rate limits, cart max, Stripe min/shipping cents, origins, `getValidOrigin`   |
| 3     | **Done** | `lib/rate-limit.ts`, `lib/security.ts`                                                               |
| 4     | **Done** | + `lib/stripe-session.ts` (`buildCheckoutSessionCreateParams`, shipping prefill)                     |
| 4c    | **Done** | `lib/orders.ts` — shipping payload, VIP threshold, pending order insert, line items, VIP invoke      |
| 4d    | **Done** | `lib/stripe-customer.ts`, `lib/auth-user.ts` — customer id lookup, optional JWT user                 |
| 5     | **Done** | Zod + `lib/errors.ts` (422 mapping); `lib/*_test.ts` + `npm run test:create-payment`; `DATA_FLOW.md` |

**Module map**

```
create-payment/
  index.ts           # serve() orchestration, Stripe session object, orders
  types.ts
  constants.ts
  lib/
    log.ts
    rate-limit.ts
    security.ts
    verified-cart.ts  # product IDs, fetch, verified cart lines
    discount.ts       # server-side coupon resolution
    amounts.ts        # subtotals, discount cap, Stripe line_items, sum
    stripe-session.ts # Checkout SessionCreateParams + address prefill
    orders.ts         # shipping payload, VIP threshold, order + items, VIP notify
    stripe-customer.ts
    auth-user.ts
    checkout-schema.ts
    payment-events.ts
    stripe-client.ts
    errors.ts
    *_test.ts         # Deno tests (import @std/assert)
  DATA_FLOW.md
  REFACTOR_PLAN.md
```

**Verify after pulls**

```bash
cd supabase/functions && deno check create-payment/index.ts --config deno.json --lock deno.lock --frozen && deno lint create-payment/ --config deno.json && deno test create-payment/ --config deno.json --lock deno.lock --frozen
```

GitHub: workflow **Deno create-payment** (same branch triggers as root **CI**). Locally from repo root: `npm run verify:create-payment`.

---

## Principles

| Principle             | How we honour it                                                                                                                        |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Testable**          | Every phase adds or extends a verifiable gate: `deno check`, `deno lint`, targeted unit tests, or a manual smoke checklist.             |
| **Reversible**        | One concern per change; no “big bang” merge. Prefer feature flags only if behaviour must diverge in production mid-refactor.            |
| **Stable**            | Default: extract/move code without changing runtime behaviour. Behaviour changes get their own phase with explicit acceptance criteria. |
| **Documented**        | This file + a one-line update to `AGENTS.md` or the function README when the layout changes (optional; see Phase 0).                    |
| **Iterative / retro** | After each phase: 5–15 minute retro (below). Adjust the next phase before starting it.                                                  |

### Retro template (after each phase)

Answer briefly and file notes in the PR description or a team doc:

1. **Done?** Acceptance criteria met?
2. **Surprises?** Types, Stripe, Supabase, or deploy issues?
3. **Quality gates?** Check/lint/tests still green?
4. **Rollback used?** If yes, why — document the trigger.
5. **Next phase tweak?** Scope up/down?

---

## Baseline (before Phase 1)

**Record today’s “contract”:**

- [ ] `deno check supabase/functions/create-payment/index.ts` passes
- [ ] `deno lint supabase/functions/create-payment/index.ts` passes
- [ ] Document env vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `SITE_URL`
- [ ] Note one **manual smoke path**: happy path checkout (or describe why manual isn’t available)

**Rollback:** N/A (baseline only).

---

## Phase 0 — Plan ownership (optional, ≤30 min)

**Goal:** Make the plan discoverable without bloating the repo.

- [ ] Keep this file at `supabase/functions/create-payment/REFACTOR_PLAN.md`
- [ ] (Optional) Add one sentence under Supabase / edge functions in `AGENTS.md` linking to this plan

**Tests:** None beyond baseline.  
**Reversibility:** Remove the `AGENTS.md` line if undesired.  
**Retro:** Confirm teammates know where the plan lives.

---

## Phase 1 — Extract types (no behaviour change)

**Goal:** Move domain + helper types out of `index.ts`; entry file imports them.

**Steps**

1. Add `supabase/functions/create-payment/types.ts` with all `type` aliases currently in `index.ts`.
2. Update `index.ts` to `import type { … } from './types.ts'` (or path your Deno layout expects).
3. Run `deno check` on `create-payment/index.ts` and on `types.ts`.

**Acceptance criteria**

- [ ] Byte-for-byte same runtime (no logic edits).
- [ ] `deno check` + `deno lint` clean for the function folder.

**Tests**

```bash
cd supabase/functions && deno check create-payment/index.ts && deno lint create-payment/index.ts
```

**Rollback:** Revert the commit; restore single-file types.

**Retro:** Was the import map / relative path obvious on CI?

---

## Phase 2 — Extract constants and CORS (no behaviour change)

**Goal:** `constants.ts` (or `config.ts`) holds CORS headers, rate-limit numbers, shipping cents, Stripe minimum cents, production origin.

**Steps**

1. Create `constants.ts`; move literals only.
2. `index.ts` imports constants.
3. `deno check` / `deno lint`.

**Acceptance criteria**

- [ ] Same header names and values.
- [ ] Same numeric constants for shipping / min charge.

**Tests:** Same as Phase 1 commands.

**Rollback:** Single revert.

**Retro:** Any constant duplicated elsewhere in the repo? (dedupe later or document.)

---

## Phase 3 — Extract pure utilities (no behaviour change)

**Goal:** `lib/security.ts` (CSRF, sanitize, email) and `lib/rate-limit.ts` (store + check).

**Steps**

1. Move functions; keep signatures identical.
2. Unit-test **pure** functions first (email, sanitize) if you add `deno test` — optional this phase.
3. `deno check` entire `create-payment/` tree.

**Acceptance criteria**

- [ ] Handler still calls the same helpers in the same order.

**Tests**

- `deno check create-payment/**/*.ts`
- (Optional) `deno test create-payment/security_test.ts` for `isValidEmail` / `sanitizeString` only

**Rollback:** Revert module extraction commit.

**Retro:** Is rate-limit state still acceptable as in-memory, or note “Phase 7+” for external store?

---

## Phase 4 — Extract “domain steps” with stable interfaces (still reversible)

**Goal:** Internal modules with **explicit inputs/outputs** (plain objects), e.g.:

- `buildVerifiedItems(supabase, cartItems) → VerifiedCartItem[]` (throws on business error)
- `resolveDiscount(supabase, verifiedItems, discount) → { cents, code, freeShipping }`
- `buildStripeLineItems(verifiedItems, ratio, …) → CheckoutSessionLineItem[]`

**Rules**

- **No** change to HTTP status codes or JSON shapes in this phase unless a bug is proven.
- Pass `SupabaseClient` and primitives in; avoid hidden globals except where unavoidable (e.g. rate limit store — keep in `rate-limit.ts`).

**Acceptance criteria**

- [ ] `index.ts` reads as orchestration only (~150–250 lines target).
- [ ] Same integration behaviour (smoke test).

**Tests**

- `deno check` on all touched files
- Manual smoke: one full checkout path
- (Recommended next phase) unit tests for **pure** builders (line items, discount cap)

**Rollback:** Revert; may be larger — keep phase 4 commits **per module** (e.g. one commit for `verified-items.ts`, one for `discount.ts`).

**Retro:** Which extracted function is still too entangled with `Request`? Consider a thin “context” type in a later pass.

---

## Phase 5 — Request validation (behaviour may tighten; document)

**Goal:** Replace naked `as CheckoutCartItem[]` with **schema validation** (e.g. Zod). Invalid bodies → **422** with stable error shape **if** you choose to align with existing errors.

**Rules**

- Decide explicitly: **strict** (reject unknown fields) vs **strip** unknown fields.
- Add golden tests: valid payload, missing items, bad email, string product id.

**Acceptance criteria**

- [x] Validation rules live in `lib/checkout-schema.ts` (strip unknown top-level keys; `items` strict; nested objects passthrough).
- [x] Coercion / bounds documented in `DATA_FLOW.md` + `lib/checkout-schema_test.ts`.
- [x] Zod errors use `CHECKOUT_VALIDATION_ERROR_PREFIX`; `lib/errors.ts` maps to **422**.

**Tests**

- [x] `deno test create-payment/` (schema, amounts, discount rules, cart, orders, security, rate-limit, Stripe builders).
- Manual: invalid payload returns expected status/body

**Rollback:** Revert validation commit; restores loose parsing.

**Retro:** Did validation catch a real client bug? Adjust frontend in parallel?

---

## Phase 6 — Supabase typing (reduce `as` casts)

**Goal:** Introduce generated `Database` types and `createClient<Database>()` for this function (or shared types package).

**Acceptance criteria**

- [ ] Fewer `as SupabaseListResult<…>` where the client can infer rows.
- [ ] `deno check` still clean.

**Tests:** `deno check` + one insert/select path typechecked.

**Rollback:** Revert typings commit; keep runtime.

**Retro:** Is codegen in CI documented?

---

## Phase 7 — Operational hardening (optional, each sub-phase reversible)

Pick **one** per small PR:

1. **Durable rate limiting** (DB/Redis) — new failure modes; feature-flag or env toggle.
2. **Idempotency** (reuse `x-checkout-session-id` or new key) — must be spec’d and tested.
3. **Structured logs** (JSON + `correlation_id`) — observability only.

Each sub-phase: acceptance criteria + rollback + retro.

---

## Definition of done (whole initiative)

When you stop iterating (or pause):

- [ ] `index.ts` is orchestration-only or clearly sectioned with extracted modules.
- [ ] Types and constants live in dedicated files.
- [ ] `deno check` / `deno lint` documented in `AGENTS.md` or this plan for the `create-payment` folder.
- [ ] At least **one** automated test file for pure logic (amounts, line items, or schema).
- [ ] Manual smoke path documented.
- [ ] Team has run at least one **retro** per major phase.

---

## Suggested execution order (summary)

| Phase | Risk        | Reversibility            |
| ----- | ----------- | ------------------------ |
| 0     | None        | Trivial                  |
| 1     | Low         | Trivial                  |
| 2     | Low         | Trivial                  |
| 3     | Low         | Easy                     |
| 4     | Medium      | Easy if small commits    |
| 5     | Medium–High | Easy (revert validation) |
| 6     | Low–Medium  | Easy                     |
| 7     | High (ops)  | Per sub-phase            |

---

## Quick reference — commands

```bash
cd supabase/functions
deno check create-payment/index.ts
deno lint create-payment/index.ts
# After modularisation:
deno check create-payment/**/*.ts
```

---

_Last updated: plan template for iterative execution; adjust phase scope after each retro._
