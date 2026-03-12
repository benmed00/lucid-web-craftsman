# Supabase Security Audit Report (Production Baseline)

Date: 2026-03-12  
Scope: Supabase database schema/policies/migrations, storage policies, edge functions, frontend key handling, and deployment headers.

## 1) Backend Structure Map

### Schemas

- `public` (application tables and RLS policies)
- `auth` (Supabase Auth-managed)
- `storage` (buckets + object policies)
- `extensions` (explicitly used in migrations)

### Public tables (55)

- `admin_order_permissions`, `admin_users`, `app_settings`, `artisan_translations`, `artisans`, `audit_logs`, `back_in_stock_notifications`, `blog_post_translations`, `blog_posts`, `cart_items`, `categories`, `checkout_sessions`, `contact_messages`, `discount_coupons`, `email_ab_tests`, `email_logs`, `fraud_assessments`, `fraud_rules`, `hero_images`, `loyalty_points`, `loyalty_redemptions`, `loyalty_rewards`, `loyalty_transactions`, `newsletter_subscriptions`, `notification_preferences`, `notification_settings`, `order_anomalies`, `order_items`, `order_state_transitions`, `order_status_customer_mapping`, `order_status_history`, `orders`, `payment_events`, `payments`, `product_analytics`, `product_categories`, `product_reviews`, `product_translations`, `products`, `profiles`, `rate_limits`, `scheduled_emails`, `security_alerts`, `security_config`, `security_events`, `shipments`, `shipping_addresses`, `shipping_zones`, `support_ticket_messages`, `support_tickets`, `support_tickets_error_reports`, `tag_translations`, `user_preferences`, `user_roles`, `wishlist`.

### Key relationships (high-level)

- Order graph: `orders` -> `order_items`, `payments`, `payment_events`, `order_status_history`, `shipments`, `order_anomalies`.
- User graph: `profiles` -> `shipping_addresses`, `cart_items`, `wishlist`, `loyalty_*`, `user_roles`, `admin_users`.
- Product graph: `products` -> `product_reviews`, `product_analytics`, `product_translations`, `product_categories`.

### Exposed APIs

- PostgREST for `public` schema tables via Supabase client.
- Storage buckets used by frontend:
  - `avatars`, `hero-images`, `product-images`, `blog-images`, `review-photos`, `error-screenshots`.
- Edge functions used from frontend:
  - `order-lookup`, `verify-payment`, `verify-paypal-payment`, `submit-contact`, `translate-tag`, `send-abandoned-cart-email`.

## 2) Findings by Severity

## CRITICAL

1. **Order lookup/verification endpoints allowed broad lookup by `session_id` with service-role reads.**

   - File: `supabase/functions/order-lookup/index.ts`, `supabase/functions/verify-payment/index.ts`
   - Vulnerability: high-value order/payment data could be queried or mutated if `session_id` is discovered.
   - Impact: unauthorized order status disclosure and potential unauthorized fallback processing.
   - Fix applied:
     - Added ownership checks (`auth user_id` OR matching `x-guest-id` to `metadata.guest_id` OR internal service call).
     - Unauthorized lookups now return not-found semantics.

2. **Hardcoded frontend Supabase fallback keys/URLs were embedded in runtime code.**

   - File: `src/integrations/supabase/client.ts`, `src/main.tsx`
   - Vulnerability: static key material in source and accidental environment drift.
   - Impact: key hygiene and scanner findings; higher operational risk during key rotation.
   - Fix applied:
     - Removed hardcoded fallback values.
     - Fail-fast/skip diagnostics when required env vars are missing.

3. **Security/log table INSERT accepted any authenticated actor.**
   - Table: `audit_logs`, `email_logs`, `security_events`, `security_alerts`
   - Vulnerability: authenticated users could forge/poison operational security logs.
   - Impact: loss of audit integrity and incident-response reliability.
   - Fix applied:
     - Added restrictive insert policies requiring `is_admin_user(auth.uid())`.

## HIGH

4. **`app_settings` read policy too broad for authenticated users.**

   - Table: `app_settings`
   - Vulnerability: unrestricted read of operational settings.
   - Impact: business/security configuration disclosure.
   - Fix applied:
     - Added restrictive policy allowing only approved storefront keys or admin users.
     - Added anon safe-key read policy for storefront-only keys to preserve guest UX without exposing sensitive settings.

5. **Storage policies had weak write constraints on sensitive buckets.**

   - Buckets: `blog-images`, `review-photos`, `error-screenshots`
   - Vulnerability: overly broad authenticated writes and weak ownership checks.
   - Impact: unauthorized content upload/overwrite and data exposure risk.
   - Fix applied:
     - `blog-images`: admin-only write via restrictive policies.
     - `review-photos`: enforced folder ownership on upload/delete.
     - `error-screenshots`: enforced owner/admin read and strict upload path rules.
     - Frontend upload path updated to owner-scoped `reports/<owner>/...`.

6. **Security headers baseline incomplete / CSP syntax issues.**
   - File: `public/_headers`, `vercel.json`
   - Vulnerability: missing `X-Frame-Options`, malformed CSP source tokens.
   - Impact: weaker clickjacking/content-injection defense in production.
   - Fix applied:
     - Added baseline headers in Vercel config.
     - Fixed CSP syntax and added `X-Frame-Options` in static headers.

## MEDIUM

7. **`verify_jwt=false` on multiple functions increases dependence on handler-level auth checks.**

   - File: `supabase/config.toml`
   - Impact: mistakes in per-function auth logic could become exploitable.
   - Mitigation status: **not globally flipped in this patch** to avoid breaking webhook/internal trigger flows that intentionally rely on non-JWT routes.
   - Recommended next step: split public-webhook vs internal/admin endpoints and enable `verify_jwt=true` wherever feasible.

8. **Service role key appeared in frontend env typing.**
   - File: `vite-env.d.ts`
   - Impact: confusion and accidental misuse in client-side code.
   - Fix applied: removed service-role declaration from `ImportMetaEnv`.

## LOW

9. **Public schema hosts multiple operational/internal tables.**
   - Tables include internal/security/ops objects such as `audit_logs`, `security_*`, `rate_limits`, `payment_events`.
   - Impact: larger API blast radius if policies regress.
   - Recommended long-term hardening:
     - Migrate internal tables to a private schema behind RPC/Edge interfaces only.

## 3) RLS Baseline Outcome

- A new migration enforces `ENABLE ROW LEVEL SECURITY` on every known `public` table in this project.
- Added restrictive policies hardening the highest-risk surfaces (settings, logs, storage ownership).
- Existing explicit allow-policies remain in effect, preserving normal behavior while reducing over-broad access.

## 4) SQL Patch

- Applied patch file:
  - `supabase/migrations/20260312120000_security_baseline_hardening.sql`

## 5) Validation queries (recommended in Supabase SQL editor)

```sql
-- Verify RLS enabled
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;

-- Policy inventory
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;
```

## 6) Residual Risk Notes

- Some endpoints intentionally remain public (`submit-contact`, payment/webhook flows), so abuse resistance still depends on strong validation/rate-limit/signature checks in function code.
- A full private-schema migration for internal tables is recommended as a staged follow-up to avoid runtime breakage.
