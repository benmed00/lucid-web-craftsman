# Test Suite Feedback & Optimization Report

**Date:** 2026-02-20  
**Test Run:** 187 tests total — 165 passed, 15 failed, 7 skipped

---

## Executive Summary

The test suite covers multiple layers (unit, integration, RLS, edge functions) but has several blocking issues and optimization opportunities.

---

## 1. Critical Fixes (Blocking)

### 1.1 Missing `@testing-library/dom` Dependency

**Impact:** AuthContext, BlogCard, and Navigation component tests fail to load.

**Error:**

```
Cannot find module '@testing-library/dom'
Require stack: @testing-library/react/dist/pure.js
```

**Fix:** Add as dev dependency (may require `--legacy-peer-deps`):

```bash
npm install @testing-library/dom --save-dev --legacy-peer-deps
```

### 1.2 RLS E2E — Incorrect "allowed" Semantics

**Impact:** 8 tests fail for anonymous access (profiles, contact_messages, audit_logs, etc.).

**Root cause:** When RLS blocks SELECT, Postgres returns **0 rows without error**. The runner sets `allowed = !error`, so "blocked" queries are reported as `allowed: true`.

**Current logic:**

```ts
allowed: !error  // RLS block = 0 rows, no error → allowed = true
```

**Expected:** For "should NOT be able to SELECT" tests, use **data isolation** (rowCount) not error presence:

| Assertion | Current | Recommended |
|-----------|---------|-------------|
| Anonymous cannot read profiles | `expect(result.allowed).toBe(false)` | `expect(result.rowCount).toBe(0)` |

**Fix:** Change the test assertions from `result.allowed` to `result.rowCount === 0` for SELECT-block tests, or introduce `effectiveAccess: rowCount > 0` in the runner.

### 1.3 RLS Quick Validation — UPDATE/DELETE Expectations

**Impact:** 5 tests fail (products UPDATE/DELETE, audit_logs, payments).

**Root cause:** RLS typically returns **0 rows affected**, not an error, when the user has no matching rows. The tests expect `error !== null` but get `null`.

**Fix:** For UPDATE/DELETE "should block" tests:

- Use rows that exist and verify the operation affects 0 rows, or
- Check `data === null` / `data?.length === 0` in addition to error.

### 1.4 RLS Policies — Missing `shipping_addresses`

**Impact:** 1 test fails.

**Fix:** Add `shipping_addresses` to `POLICY_TESTS` in `rls-policies.test.ts` with appropriate expected access levels.

### 1.5 UnifiedCache — Infinite Timer Loop

**Impact:** "should return stale data and trigger background refresh" hits Vitest's 10000-timer limit.

**Root cause:** `vi.runAllTimersAsync()` runs the cache's 5-minute cleanup `setInterval` repeatedly, causing an infinite loop.

**Fix:** Replace `vi.runAllTimersAsync()` with `await Promise.resolve()` (or `vi.waitFor`) to flush the background fetch microtask, since `refreshInBackground` uses promises, not timers.

---

## 2. Environmental / Setup Issues

### 2.1 RLS E2E — Test Users Not Seeded

**Impact:** Auth for regular_user, admin, super_admin fails — several tests skip.

**Log:** `Auth failed for test-user@example.com: Invalid login credentials`

**Fix:** Either:

1. Create seeded test users and set `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, etc. in `.env`
2. Use `it.skipIf()` for tests that require auth when credentials are missing
3. Document setup in README

### 2.2 Multiple GoTrueClient Warning

**Impact:** No failures, but noisy stderr.

**Suggestion:** Use a single Supabase client instance per test file via `beforeAll` and reuse it.

---

## 3. Optimization Proposals

### 3.1 Test Organization

- **Split by type:** `unit/`, `integration/`, `e2e/` folders
- **Naming:** `*.test.ts` for unit, `*.integration.test.ts` for Supabase/external deps
- **Config:** Use `vitest.workspace.ts` or `pool: 'forks'` for isolation

### 3.2 Conditional RLS Tests

RLS tests depend on:

- Supabase URL + keys
- Seeded test users and roles
- Exact schema

**Proposal:**

- Skip RLS E2E when `!VITE_SUPABASE_URL` or `!TEST_USER_EMAIL`
- Add `test:rls` script that runs only RLS tests
- Document in README as "extended" or "integration" tests

### 3.3 Edge Functions — Reduce Network Usage

**Current:** Each function invoked over HTTP (15 functions × multiple tests).

**Proposal:**

- Group invocations in `describe` blocks
- Use `--reporter=dot` for CI
- Consider `test.skip` for optional service-role tests when key is missing

### 3.4 Mocking Strategy

- **Supabase:** Use `vi.mock('@supabase/supabase-js')` for unit tests
- **Edge functions:** Add a "contract" test mode that mocks `fetch` for response validation without network

### 3.5 Performance

- **Vitest:** `pool: 'threads'` (default) or `pool: 'forks'` for better parallelism
- **Timeouts:** Edge function tests use 15s; consider reducing for validation-only tests
- **Isolate slow tests:** Tag with `@slow` and exclude from default runs

---

## 4. Recommended Priority

| Priority | Item | Effort | Status |
|----------|------|--------|--------|
| P0 | Fix `@testing-library/dom` | Low | Pending |
| P0 | Fix UnifiedCache timer test | Low | ✅ Done |
| P0 | Add `shipping_addresses` to POLICY_TESTS | Low | ✅ Done |
| P0 | Single shared Supabase client in edge-functions tests | Low | ✅ Done |
| P1 | Align RLS E2E assertions with RLS semantics | Medium | ✅ Done |
| P1 | Fix RLS quick validation UPDATE/DELETE checks | Medium | ✅ Done |
| P2 | Document/test user setup for RLS E2E | Medium | Pending |
| P2 | Consolidate Supabase client in tests | Low | ✅ Done (edge-functions) |
| P3 | Reorganize test folders and scripts | Medium | Pending |

---

## 5. Quick Commands

```bash
# Unit + fast integration only (no RLS E2E)
npm run test -- --run --exclude "**/rls-e2e*"

# Edge functions only
npm run test:edge-functions

# Full suite (requires env + seeded users)
npm run test -- --run
```
