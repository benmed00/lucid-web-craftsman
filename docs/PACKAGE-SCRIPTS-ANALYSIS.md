# package.json Scripts — Analysis & Mitigations

**Date:** 2026-02-22  
**Scope:** All 23 npm scripts in `package.json`

---

## Executive Summary

| Status | Scripts |

| --------- | --------- |

| ✅ OK | 12 |
| ⚠️ Fix | 7 |
| 📌 Enhance | 4 |

---

## 1. Script-by-Script Analysis

### postinstall — `node scripts/install-backend.cjs`

**Status:** ✅ OK

- Installs backend dependencies when `backend/package.json` exists. Skips gracefully if missing.
- Uses Node's execPath for npm, works on Windows when PATH lacks npm.

---

### dev — `vite`

**Status:** ✅ OK

- Starts Vite dev server on port 8080.
- Proxies `/api` and `/health` to `localhost:3001`.

**Enhancement:** Add `dev:api` to run dev + API together (see §5).

---

### start / start:api — `node backend/server.cjs`

**Status:** ✅ OK

- Both run the mock API on port 3001. Consider consolidating to one name or documenting the alias.

---

### build — `vite build`

**Status:** ✅ OK

- Builds successfully. Warns on large chunks (e.g. index ~1 MB, AdminBlog ~1.1 MB).
- **Recommendation:** Add `manualChunks` in vite.config to split large bundles (PR_4_REVIEW_AND_SYNC_PLAN.md).

---

### predeploy / deploy — `vite build` / `gh-pages -d dist`

**Status:** ✅ OK

- `predeploy` runs before `deploy` via npm lifecycle.
- **Caveat:** If deploying to Netlify/Vercel, `gh-pages` is redundant; document which platform is primary.

---

### build:prod / build:dev — `vite build --mode production|development`

**Status:** ⚠️ Redundant

- Vite’s default mode for `vite build` is `production`. `build:dev` uses dev mode (no minification, different env).
- **Mitigation:** Keep for explicit modes; add `build:preview` if you need staging env.

---

### lint — `eslint .`

**Status:** ⚠️ BROKEN

```text
TypeError: Error while loading rule '@typescript-eslint/no-unused-expressions':
Cannot read properties of undefined (reading 'allowShortCircuit')
```

- **Cause:** ESLint 9 + `typescript-eslint` v8 mismatch when linting `.ts`/`.tsx` and Cypress `.ts` (cypress/support/commands.ts).
- **Mitigation:** Add Cypress-specific ESLint override, or exclude `cypress/**` until rule fix.

---

### lint:fix — `eslint . --fix`

**Status:** ⚠️ BROKEN

- Same as `lint`; fails before applying fixes.

---

### preview — `vite preview`

**Status:** ✅ OK

- Serves production build locally. Requires `npm run build` first.

---

### format / format:check — Prettier

**Status:** ⚠️ ISSUES

- `format:check` reports ~408 files with style issues. Many files need formatting.
- Prettier glob `"**/*.{ts,tsx,js,jsx,json,md,html,css}"` is broad; `.prettierignore` exists but `node_modules` etc. should be respected (Prettier does this by default).
- `.prettierignore` excludes `package-lock.json`, `db.json`; `.lovable/plan.md` still warned (consider ignoring).
- **Mitigation:** Run `npm run format` once to fix, then add `format:check` to CI. Optionally narrow globs or add more ignores.

---

### test — `vitest`

**Status:** ✅ OK

- 122 tests pass (96 skipped in RLS/env-gated tests).
- Console noise: `act()` warnings in AuthContext tests, "useAuth outside provider" expected error. See TEST-LOG-ANALYSIS.md.

---

### test:ui — `vitest --ui`

**Status:** ✅ OK

- Opens Vitest UI. Requires `@vitest/ui` (present in devDependencies).

---

### test:edge-functions — `vitest run src/tests/edge-functions*.ts`

**Status:** ✅ OK

- Runs edge function tests explicitly; useful for CI/focused runs.

---

### coverage — `vitest run --coverage`

**Status:** ⚠️ BROKEN

```text
MISSING DEPENDENCY  Cannot find dependency '@vitest/coverage-v8'
```

- **Mitigation:** Add `@vitest/coverage-v8` to devDependencies and configure in vite.config if needed.

---

### e2e:open / e2e:run — Cypress

**Status:** ⚠️ Partial

- `e2e:open` / `e2e:run` work for specs in `cypress/integration/**`.
- **Bug:** `cypress.config.ts` uses `specPattern: "cypress/integration/**/*.{js,ts}"`. `cypress/e2e/checkout_flow_spec.js` is not included.
- **Mitigation:** Update spec pattern to also include `cypress/e2e/**` or move checkout spec into `integration/`.

---

### e2e:smoke / e2e:regression — `cypress run --env grep=@smoke|@regression`

**Status:** ✅ Fixed

- `@smoke` added to header_nav (visual stability) and checkout_flow — critical path.
- `@regression` added to all specs (header_nav, mobile_menu, navigation_stability, checkout_flow).
- `e2e:smoke` runs ~2 specs; `e2e:regression` runs full suite.

---

### browserslist:update — `npm update caniuse-lite browserslist`

**Status:** ✅ OK

---

### test:unit — `vitest run --exclude "**/rls-*"`

**Status:** ✅ Added (2026-02-22)

- Runs unit tests excluding RLS/E2E (rls-e2e, rls-quick-validation, rls-policies). Faster for development feedback.

---

### validate — `npm run lint && npm run format:check && npm run test -- --run`

**Status:** ✅ Added (2026-02-22)

- Single script for CI: runs lint, format check, and unit tests.

- **Note:** Will fail if files need Prettier formatting; run `npm run format` first.

- Clears "Browserslist: caniuse-lite is outdated" warnings. PR docs suggest `npx update-browserslist-db@latest` as alternative; current command works.

---

## 2. Cross-Cutting Issues

| Issue                       | Scripts Affected          | Priority           |
| --------------------------- | ------------------------- | ------------------ |
| ESLint rule crash           | lint, lint:fix            | High               |
| Missing @vitest/coverage-v8 | coverage                  | High               |
| Prettier format drift       | format:check              | Medium             |
| Cypress spec path mismatch  | e2e:\*                    | Medium             |
| Orphan grep tags            | e2e:smoke, e2e:regression | Low                |
| build chunk size warnings   | build                     | Low (optimization) |

---

## 3. Recommended Mitigations (Quick Wins)

### 3.1 Fix ESLint (lint/lint:fix)

**Option A — Exclude Cypress from TS rules:**

```js
// eslint.config.js
{ ignores: ["dist", "cypress/**"] },
```

**Option B — Add Cypress override with relaxed rules:**

```js
{
  files: ["cypress/**/*.{ts,js}"],
  extends: [...],
  rules: {
    "@typescript-eslint/no-unused-expressions": "off",
  },
},
```

### 3.2 Fix coverage

```bash
npm install -D @vitest/coverage-v8
```

Optionally add to `vite.config.ts`:

```ts
test: {
  coverage: {
    provider: 'v8',
    reporter: ['text', 'html'],
  },
},
```

### 3.3 Fix Prettier

```bash
npm run format
```

Then commit formatted files. Add `format:check` to CI.

### 3.4 Fix Cypress spec path

In `cypress.config.ts`:

```ts
specPattern: "cypress/{integration,e2e}/**/*.{js,ts}",
```

Or move `cypress/e2e/checkout_flow_spec.js` → `cypress/integration/`.

### 3.5 Tag Cypress specs (e2e:smoke / e2e:regression) — ✅ Done

- `@smoke` on header_nav (visual stability) + checkout_flow
- `@regression` on all spec blocks

---

## 4. Enhancement Proposals

| Enhancement | Description                                                     | Status  |
| ----------- | --------------------------------------------------------------- | ------- |
| `validate`  | Single script: lint + format:check + test (for CI)              | Done    |
| `dev:all`   | Run `dev` and `start:api` in parallel (e.g. via `concurrently`) | Pending |
| `test:unit` | Exclude RLS/E2E: `vitest run --exclude "**/rls-*"`              | Done    |
| `prepare`   | Optional: run `format:check` or `lint` pre-commit (husky)       | Pending |

---

## 5. Post-Fix Checklist

- [ ] `npm run lint` passes
- [ ] `npm run lint:fix` passes
- [ ] `npm run coverage` produces report
- [ ] `npm run format:check` passes (after `format`)
- [ ] `npm run e2e:run` includes checkout spec
- [x] `e2e:smoke` / `e2e:regression` run expected specs (tags added)

---

## 6. References

- [Vitest Coverage](https://vitest.dev/guide/coverage)
- [ESLint Flat Config](https://eslint.org/docs/latest/use/configure/configuration-files)
- [Cypress Grep](https://github.com/cypress-io/cypress-grep)
- [TEST-LOG-ANALYSIS.md](./TEST-LOG-ANALYSIS.md)
- [PR_4_REVIEW_AND_SYNC_PLAN.md](../PR_4_REVIEW_AND_SYNC_PLAN.md)
