# Make main reliably buildable on React 18 + fix Netlify headers

## Problem statement

`origin/main` was not reliably buildable/installable in local environments due to dependency graph drift and stale working-tree history.

### Concrete failures observed

- **`npm ci` failed** — peer dependency conflict: `react-leaflet@5` requires React 19 while the app is on React 18
- **Builds could fail** with missing modules after partial installs or branch switches
- **Netlify deploy checks failed** due to invalid `public/_headers` syntax
- **Vite emitted a warning** about unsupported `rollupOptions.output.sourcemap`

---

## Scope (what this PR changes)

### 1) Dependency graph made consistent for React 18

- Pin `react-leaflet` to ^4.2.1 (React 18 compatible)
- Remove deprecated `@types/dompurify` stub (DOMPurify ships its own types)
- Apply safe `npm audit fix` updates where applicable

### 2) Build and deploy hygiene

- Fix Netlify `public/_headers` formatting so the "Header rules" check passes
- Remove unsupported Vite config (`rollupOptions.output.sourcemap`) and rely on `build.sourcemap`
- Add `.gitignore` entries for backups and build/test artifacts

### 3) UX and correctness improvements

- **Calendar navigation icons**: preserve props and add `aria-label` for accessibility
- **ErrorBoundary** in utils.ts: align with Vite base and add `toast.error` on catch for user-facing feedback
- **BASE_PATH**: set to `"/"` to match `vite.config` base

---

## Files changed

| File | Change |
| ------ | -------- |
| `package.json` | react-leaflet ^4.2.1, remove @types/dompurify, add metadata (author, repo, engines, keywords) |
| `package-lock.json` | Regenerated to reflect dependency changes |
| `public/_headers` | Netlify syntax fixes (use `#` for comments; valid path blocks) |
| `vite.config.ts` | Remove unsupported `rollupOptions.output.sourcemap` |
| `src/components/ui/calendar.tsx` | Add `aria-label` to nav icons |
| `src/lib/utils.ts` | BASE_PATH="/", ErrorBoundary toast, Window declare |
| `.gitignore` | Add js-backup/, *.tsbuildinfo, coverage/, cypress artifacts |

---

## Technical decisions

| Decision | Rationale |
| ---------- | ----------- |
| **React 18 compatibility** | `react-leaflet@5` requires React 19; pinning to v4 restores a compatible peer set without forcing a React major upgrade |
| **Keep upstream structure** | During conflict resolution, kept upstream file layout and did not resurrect deleted paths |
| **Security posture** | Remaining moderate advisory (esbuild via Vite) requires a Vite major upgrade; not included to avoid breaking changes |

---

## Risks and trade-offs

- `react-leaflet` pinned to v4 until a React 19 upgrade is planned
- `npm audit` is improved but not fully eliminated due to the Vite/esbuild advisory (dev-server related); avoid exposing the dev server to untrusted networks

---

## Test plan (performed)

- [x] `npm ci` (or `npm install`)
- [x] `npm run lint`
- [x] `npm run test`
- [x] `npm run build`
- [x] Netlify deploy preview builds

---

## Post-merge checklist

- [ ] `npm ci` succeeds on clean clone
- [ ] `npm run build` succeeds
- [ ] Netlify deploy preview passes header validation
- [ ] E2E (if applicable) runs without regression

---

## Follow-ups (optional)

- Consider a dedicated PR for a React 19 migration (unblocks `react-leaflet@5`)
- Reduce bundle size warnings via targeted code-splitting or `manualChunks`
- Refresh Browserslist DB in CI: `npx update-browserslist-db@latest` (non-blocking warning)

---

## Closes

Closes #5 (main branch is not reliably buildable/installable)
