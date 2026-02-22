
# State Coherence and Caching Architecture Fix

## Problem Summary

Your application suffers from **state desynchronization** caused by multiple uncoordinated caching and storage layers. This manifests as:
- Content not refreshing after actions
- Auth appearing lost after Stripe redirects
- Different behavior between preview and live environments
- Infinite loading skeletons in profile tabs

## Root Causes Identified

1. **Service Worker caches HTML navigation** -- `networkFirst` for `navigate` requests still stores and serves stale HTML shells
2. **Stripe redirect origin mismatch** -- `req.headers.get("origin")` in the `create-payment` Edge Function returns the preview iframe origin, not the actual domain the user sees
3. **No SW bypass for Supabase non-storage API** -- the SW skips `supabase.co` unless it includes `/storage/`, but the condition is checked with `includes` which could match unintended URLs
4. **Auth initialization race** -- 8-second safety timeout in AuthContext fires before Supabase resolves in slow networks, showing "not logged in" state
5. **IndexedDB/Firebase heartbeat entries** -- leftover Firebase IndexedDB entries from third-party scripts add confusion (cosmetic, not functional)

## Phased Implementation Plan

### Phase 1: Service Worker Hardening (Critical)

**File: `public/sw.js`**

- Remove HTML caching entirely -- the `networkFirst` handler for `navigate` requests caches HTML, which can serve stale shells after deployments or auth changes
- Add explicit bypass for all API/auth paths (`/auth/`, `/rest/`, `/functions/`)
- Add a `MAX_CACHE_SIZE` limit per cache bucket to prevent unbounded growth
- Bump cache version to `v5` to force old cache purge on next deploy

Changes:
- `networkFirst` for navigation will become **network-only** (no cache fallback for HTML)
- Add `/api/`, `/auth/` path exclusions in the fetch handler
- Keep cache-first only for fingerprinted static assets and images

### Phase 2: Stripe Redirect Origin Fix (Critical)

**File: `supabase/functions/create-payment/index.ts`**

- Replace `req.headers.get("origin")` with a hardcoded production URL or a validated allowlist
- This prevents the success URL from pointing to the preview iframe origin, which would cause auth loss on return

Logic:
```text
allowed_origins = [production_url, preview_url]
origin = request origin header
if origin in allowed_origins -> use it
else -> use production_url as default
```

**File: `src/pages/Checkout.tsx`**

- The `window.top.location.href` escape is correct for Lovable preview
- No changes needed here, but document that **auth testing must happen on the deployed domain, not in the preview iframe**

### Phase 3: Auth Initialization Resilience (Medium)

**File: `src/context/AuthContext.tsx`**

- Reduce safety timeout from 8s to 4s -- if Supabase hasn't responded in 4s, something is wrong
- Add a `getSession()` retry on timeout (one retry before giving up)
- This addresses the console warning: `Auth initialization timed out after 8s`

### Phase 4: Cache Cleanup on Auth Events (Medium)

**File: `src/context/AuthContext.tsx`**

- On `SIGNED_OUT`: clear Service Worker caches via `caches.keys()` + `caches.delete()` to prevent stale cached pages from showing authenticated content
- On `SIGNED_IN`: invalidate any cached HTML to force fresh content

### Phase 5: Remove Redundant SW Registration (Low)

**File: `index.html` and `src/utils/cacheOptimization.ts`**

- The service worker is registered in **two places**: `index.html` inline script AND `cacheOptimization.ts` called from `main.tsx`
- Remove the `index.html` inline registration to have a single registration path
- This prevents race conditions where two registrations compete

### Phase 6: Documentation (Low)

Add a comment block at the top of `sw.js` documenting:
- What is cached and what is bypassed
- Cache versioning strategy
- Why HTML is never cached

## Files to Modify

| File | Change | Priority |
|------|--------|----------|
| `public/sw.js` | Harden: no HTML cache, explicit API bypass, version bump | Critical |
| `supabase/functions/create-payment/index.ts` | Origin allowlist for success/cancel URLs | Critical |
| `src/context/AuthContext.tsx` | Cache cleanup on auth events, reduce timeout | Medium |
| `index.html` | Remove duplicate SW registration script | Low |
| `src/utils/cacheOptimization.ts` | Keep as single SW registration point | Low |

## What This Does NOT Change

- **Auth storage mechanism**: Supabase manages tokens in localStorage, which is the correct approach for SPAs. Moving to httpOnly cookies would require a custom auth proxy server, which is out of scope for this platform.
- **IndexedDB entries**: These are from third-party scripts and harmless. No action needed.
- **Preview vs Live isolation**: This is a fundamental browser security feature. The fix ensures the app works correctly on the deployed domain; preview iframe behavior will always have limitations.

## Expected Outcomes

- No more stale HTML served after deploys or auth changes
- Stripe payment success redirects to the correct origin with valid auth
- Auth initialization resolves faster and more reliably
- Sign-out fully purges cached content
- Single, predictable service worker lifecycle
