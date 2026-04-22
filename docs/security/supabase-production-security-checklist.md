# Supabase Production Security Checklist

**Doc hub:** [Documentation index](../README.md) · [Engineering standards](../STANDARDS.md).

Use this checklist before every production deployment.

## Database / RLS

- [ ] RLS enabled on every `public` table.
- [ ] No table exposes `USING (true)` unless explicitly intended and documented.
- [ ] Sensitive tables have no anonymous `SELECT/INSERT/UPDATE/DELETE`.
- [ ] User-owned tables enforce `auth.uid() = user_id` (or equivalent owner key).
- [ ] Log/security tables are admin/service-write only.
- [ ] `DELETE` on immutable records (e.g., `payments`, `audit_logs`) is blocked.
- [ ] Policy inventory reviewed for duplicate permissive overlaps.

## Schema Exposure

- [ ] Internal/ops tables are documented for future migration to private schema.
- [ ] Public schema only contains data intended for PostgREST exposure.
- [ ] Security-definer functions use explicit `search_path`.

## Edge Functions

- [ ] `verify_jwt=true` for non-webhook endpoints unless there is a documented exception.
- [ ] Public endpoints enforce strict validation/rate limits/signature checks.
- [ ] Ownership checks exist before reading/mutating user/order/payment data.
- [ ] Service role key never used as a reusable client-side secret.
- [ ] Internal function-to-function calls use dedicated internal secrets/JWT claims.

## API Keys / Frontend

- [ ] Frontend only uses `VITE_SUPABASE_PUBLISHABLE_KEY`.
- [ ] No `SUPABASE_SERVICE_ROLE_KEY` usage in browser runtime code.
- [ ] No hardcoded keys in frontend source.
- [ ] Environment variables are required and documented.

## Storage

- [ ] Bucket visibility (`public`) is intentional and documented.
- [ ] Upload policies enforce owner/admin path constraints.
- [ ] Sensitive buckets are private and not publicly enumerable.
- [ ] Anonymous uploads are rate-limited and path-constrained.

## Headers / Web Security

- [ ] `Content-Security-Policy` set as HTTP response header.
- [ ] `Strict-Transport-Security` enabled for HTTPS domains.
- [ ] `X-Frame-Options` or CSP `frame-ancestors` configured.
- [ ] `X-Content-Type-Options: nosniff` enabled.
- [ ] `Referrer-Policy` set.

## Operational

- [ ] Security tests run (RLS quick/e2e where environment allows).
- [ ] SQL policy diff reviewed before migration apply.
- [ ] Secrets rotated after any accidental exposure.
- [ ] Audit report updated with resolved/open findings.
