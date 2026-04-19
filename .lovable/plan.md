
Let me investigate the actual current state before planning.
<lov-tool-use id="toolu_vrtx_01A8WT69pH24egkw2XLQ3L4e" name="code--exec" integration-id="code" data="{\"command\": \"grep -rn \\\"blob:\\\" src/ --include=\\\"*.ts\\\" --include=\\\"*.tsx\\\" | head -30; echo \\\"---\\\"; grep -rn \\\"window.open\\\" src/ --include=\\\"*.ts\\\" --include=\\\"*.tsx\\\" | head -20; echo \\\"---\\\"; grep -rn \\\"Détails non disponibles\\\\|Client: N/A\\\\|N/A\\\" src/ --include=\\\"*.ts\\\" --include=\\\"*.tsx\\\" | head -20\", \"user_facing_description\": \"Scanning for legacy invoice code\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01AAUQbPFGzaCvGFA5ErcW29" name="code--view" integration-id="code" data="{\"file_path\": \"src/lib/invoice/generateInvoice.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01HioG6eeJBz2d6MH7273usz" name="code--view" integration-id="code" data="{\"file_path\": \"src/pages/Invoice.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01SJqBndmo29he7Xbvvpv8Pb" name="code--view" integration-id="code" data="{\"file_path\": \"src/pages/OrderConfirmation.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01GQ4nVuyxLjcrHk2JcjqbNi" name="code--view" integration-id="code" data="{\"file_path\": \"supabase/functions/generate-invoice/index.ts\"}">
</lov-tool-use>
I'm in read-only plan mode. Let me investigate the actual state of the code and data before presenting a plan.
<lov-tool-use id="toolu_vrtx_01AvtCTiM47wLg4YSTmhBnJ1" name="code--search_files" integration-id="code" data="{\"query\": \"blob:|URL.createObjectURL|Détails non disponibles|Client: N/A\", \"include_patterns\": \"*.ts,*.tsx\", \"search_dir\": \"src\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01FpbWsEcunz2Bs3wfCLPui1" name="code--view" integration-id="code" data="{\"file_path\": \"src/lib/invoice/generateInvoice.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01WBtYmarKQJs7eRUnHNT4td" name="code--view" integration-id="code" data="{\"file_path\": \"src/pages/Invoice.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01FwgsSatUQezCFFpjXzE55e" name="code--view" integration-id="code" data="{\"file_path\": \"supabase/functions/generate-invoice/index.ts\"}">
</lov-tool-use>
Good — no legacy blob/N/A code exists in invoice flow. Now let me check OrderConfirmation, the email pipeline, and recent DB state.
<lov-tool-use id="toolu_vrtx_017aeWpSWFkHwmXr3FASVXiR" name="code--view" integration-id="code" data="{\"file_path\": \"src/pages/OrderConfirmation.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01DHmBSbCki2nFsv4XppsD3K" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"SELECT o.id, o.amount, o.currency, o.status, o.order_status, o.payment_method, o.payment_reference, o.metadata->>'customer_email' AS customer_email, o.metadata->>'guest_id' AS guest_id, o.created_at, (SELECT count(*) FROM order_items oi WHERE oi.order_id=o.id) AS items_count, (SELECT count(*) FROM payments p WHERE p.order_id=o.id) AS payments_count FROM orders o ORDER BY o.created_at DESC LIMIT 8;\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01FbC4RsZyeoVELVjesNzZdE" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"SELECT id, order_id, invoice_number, total_amount, currency, created_at FROM invoices ORDER BY created_at DESC LIMIT 5;\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01X3W3g8KTym3NUJyguJLtcg" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"SELECT template_name, recipient_email, status, order_id, error_message, created_at, sent_at FROM email_logs ORDER BY created_at DESC LIMIT 10;\"}">
</lov-tool-use>
Critical findings established. Now I have everything I need.

<lov-plan>

## Diagnostic Summary

**DB is correct:** all paid orders have items + payments. The `5f5d59f1` order has 1 item, payment row, amount=50€. Email logs show emails ARE being sent. Invoice snapshot exists with total=50€.

**Real bugs found:**

1. **`OrderConfirmation.tsx` divides amounts by 100** (lines 105–110, 376–386, and `buildResolvedOrder`). DB stores amounts in **EUROS**, not cents → `50€ / 100 = 0.50€` displayed; with rounding/truncation users see `0.00 €`. **This is the root cause** of "Total payé = 0.00 €".

2. **`OrderConfirmation.tsx` has fallback chains** (`'N/A'`, `snapshot?.email || 'N/A'`, `customerName: ''`, "Détails non disponibles" component, `OrderFallback` state). Forbidden by spec.

3. **`OrderItem` interface uses `product_name` / `image_url`** but DB returns `product_snapshot` (jsonb) — items render blank even when fetched.

4. **Invoice "blob" issue**: there is **no blob URL in invoice flow**. The only `URL.createObjectURL` calls are unrelated (sitemap, CSV exports, image previews). The reported `blob:https://...` is just `window.open('', '_blank')` opening an `about:blank` popup before injecting the HTML — browsers display this as `blob:` in some contexts. Functionally correct, but we'll switch to writing into a same-origin route so the URL is clean (`/invoice/:id?token=...`).

5. **Email regression: FALSE.** `email_logs` shows emails sent successfully for every recent paid order including today's 21:56 order. No regression.

6. **Order fetching in OrderConfirmation** likely queries with wrong field names → empty items array → triggers fallback → 0€.

## Fix Plan

### A. Fix `OrderConfirmation.tsx` (the real bug)
- **Remove all `/100` divisions.** Amounts in DB are euros.
- **Fix `OrderItem` mapping** to read from `product_snapshot` jsonb: `name = product_snapshot?.name`, `image = product_snapshot?.images?.[0]`, prices straight from `unit_price`/`total_price`.
- **Remove fallback chains:** delete `OrderFallback` state, `buildResolvedOrder`'s "Priority 3 minimal", all `'N/A'` defaults, `isFallback` flag, "Détails non disponibles" text. If DB fetch fails after polling → show explicit `OrderError` with retry + support email (no fake data).
- **Polling:** keep the 5s background poll for guests, but on definitive miss → error state, never silent zero.

### B. Fix invoice download path (no blob URL surface)
- Change `downloadInvoice(orderId, token?)` to navigate to `/invoice/:orderId?token=...` in a new tab (clean same-origin URL). The `Invoice.tsx` page already auto-triggers generation and renders HTML via `document.write` into its own window — but instead, we'll redirect to the backend HTML directly by injecting it into the existing tab. Simpler: keep current pop-up flow but open at `/invoice/:id?token=...&print=1` so the URL bar shows a real route, and have the page replace its document with the returned HTML (or render an inline iframe). No `blob:` ever appears.

### C. Strengthen `generate-invoice` Edge Function (already 90% there)
- Add **explicit step logs**: `[step1] order fetched`, `[step2] items=N`, `[step3] payments=N`, `[step4] validated`, `[step5] snapshot saved`.
- Already throws `InvoiceValidationError` (400) on: no order, no items, total≤0, paid-without-payment-ref, missing email. Keep as-is.
- Confirmed idempotent (returns cached snapshot).

### D. Token in confirmation email
- `send-order-confirmation` template currently links to `/invoice/:orderId` without token. Update the email template to call `sign-invoice-token` server-side (service-role bypass) and embed `?token=...` in the invoice link → guest can open from any device/IP without `x-guest-id` header.

### E. Validation (done after deploy)
- Re-curl `generate-invoice` for order `5f5d59f1` → must return cached snapshot with total=50€, items=1.
- Open `/order-confirmation?order_id=5f5d59f1...` → "Total payé 50.00 €", real customer name, real items.
- Open `/invoice/5f5d59f1...` → A4 invoice, no blob URL.
- Check `email_logs` after a fresh test order → sent.

## Files Changed
- `src/pages/OrderConfirmation.tsx` — remove /100, remove fallbacks, fix item mapping, error state instead of fallback
- `src/lib/invoice/generateInvoice.ts` — drop popup hack, navigate to `/invoice/:id?token=...`
- `src/pages/Invoice.tsx` — render HTML inline via iframe srcDoc (no popup, no blob)
- `supabase/functions/generate-invoice/index.ts` — add step logs
- `supabase/functions/send-order-confirmation/_templates/order-confirmation.ts` — sign token server-side, embed in invoice URL
- `supabase/functions/send-order-confirmation/index.ts` — call `signToken` before rendering

## Out of Scope
- DB schema changes (none needed)
- Stripe / webhook logic (untouched)
- New features

