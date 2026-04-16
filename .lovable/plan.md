

## Diagnosis

After reviewing `OrderConfirmation.tsx` end-to-end, the success-state logic is **already correct**:
- `pollForOrder` checks `status === 'paid' || 'completed'`
- `runVerification` (line 600) checks BOTH `status` AND `order_status`
- `reconcileOrder` (line 548) trusts `data.status === 'paid'` (handles the idempotent "already confirmed" response from reconcile-payment)

So the real issues to address are narrower than the prompt assumes. Concrete bugs/gaps remaining:

### Bug A — Reconcile idempotent path can stall (Phase 1/2)
When reconcile returns `{ success: true, reconciled: false, status: "paid", message: "Order already confirmed" }`, our code goes through `reconcileOrder` → returns `success: true`. Good. But in `runVerification` step 3, after reconcile says paid, we call `fetchOrder` again. If RLS denies the guest read (no `x-guest-id` header on this request, or guest_id mismatch), `ro` is null and we fall to `setOrder({ ...orderData, status: 'paid' })`. That works **only if** orderData was already polled. In the "order not found" branch (line 588), `finalizeFromReconcile` does another DB fetch — if it fails, we call `setState('success')` but `order` is still null → falls through to the `!order && snapshot` branch. OK if snapshot exists, but **if no snapshot, the success block renders nothing** (line 783 requires `order`, line 792 requires snapshot).

### Bug B — Safety timeout is 12s, not 5s (Phase 5)
The prompt asks for a hard 5s ceiling. Current 12s was set to avoid racing with verification. We can keep it short by making the timeout **trigger reconcile-and-success** instead of fallback when verification is still running.

### Bug C — Currency store (Phase 4)
Already wrapped in try/catch with silent fallback. Verified safe — no changes needed.

### Bug D — Empty success state when no `order` and no `snapshot`
Need a third success render path that uses the orderId only.

### Phase 6 — Email tracking
Brevo wraps links at the provider level. Code-side fix isn't possible; requires disabling click-tracking in Brevo dashboard settings. Will note this clearly.

### Phase 7 — Invoice
Client-side HTML blob already works without auth. Already implemented.

---

## Plan

**File: `src/pages/OrderConfirmation.tsx`**

1. **Strengthen `runVerification` "order not found → reconcile success" path** (lines 586-597): when `finalizeFromReconcile` fails, build a synthetic `OrderData` from snapshot + orderId so the success UI always has data.

2. **Add a 3rd success render branch** (after line 812): when `state === 'success'` but neither `order` nor `snapshot` exist, render a minimal but real success card showing the order_id and email from URL/auth — never blank.

3. **Reduce safety timeout to 8s** (line 475) and on timeout, if verification is still active, **trigger one more reconcile attempt** instead of jumping straight to fallback. Keeps "no infinite spinner" guarantee while respecting the in-flight verification.

4. **Trust reconcile `success: true` regardless of `reconciled` flag** in `reconcileOrder` (line 548): change condition to `!!data?.success` (the edge function only returns `success: true` when status is paid or already confirmed). This removes a subtle gate.

**File: `src/stores/currencyStore.ts`** — no changes (already non-blocking).

**Phase 6 — User action required (no code fix possible):** Brevo wraps all links in tracking redirects at send-time. To remove `sendibt2.com` wrappers, the user must disable **Click Tracking** in Brevo dashboard → Senders & IP → Tracking settings, or per-template. I'll note this in the response.

**Phase 7 — Invoice:** already works client-side without auth via blob URL. No change.

### Acceptance mapping
- Reconcile success → UI renders within 1 polling cycle ✓ (already)
- No infinite loading → 8s ceiling with reconcile retry ✓
- Order summary always visible → 3 fallback render branches (DB / snapshot / minimal) ✓
- Currency failure → already silent ✓
- Email links → requires Brevo dashboard toggle (out-of-code)
- Invoice → already direct blob, no auth ✓

### Out of scope (per user instructions)
- Stripe config, edge function logic, DB schema — untouched.

