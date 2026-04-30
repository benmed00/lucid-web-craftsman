/**
 * Classify **where an HTTP failure probably comes from** in this repo’s stack.
 *
 * ## Why this exists (plain English)
 *
 * When something breaks (CLI paste, Cypress log, Network tab), you often only have a URL.
 * That URL already tells you **which system** to debug:
 *
 * - **Local mock** — Express + json-server on port **3001**, or the same paths via Vite’s proxy (`/api`, `/health`).
 * - **Supabase PostgREST** — `…supabase.co/rest/v1/…` (Postgres + RLS + JWT).
 * - **Supabase Edge** — `…supabase.co/functions/v1/…` (Deno functions).
 *
 * This module **does not call the network**. It only parses the string and returns a **label**
 * + **short hint** for humans and for `classify-api-failure.mjs` / `report-e2e-http-failures.mjs`.
 *
 * For the full troubleshooting guide, see {@link PLATFORM_ANCHOR}.
 *
 * ## Input shapes
 *
 * - Full URL: `https://xyz.supabase.co/rest/v1/products`
 * - Origin + path implied: `/api/posts` (treated as “mock path”; same browser origin as Vite SPA)
 * - Host-only-ish: `myproject.supabase.co/rest/v1/foo` (parsed as https)
 *
 * ## Decision order (first match wins)
 *
 * 1. Empty / unparseable → `Unknown`.
 * 2. Host contains `supabase.co` → PostgREST, Edge Function, or other Supabase by path prefix.
 * 3. Path is `/api…` or `/health…` → **mock via Vite proxy** (implies mock must listen on **3001**).
 * 4. Host mentions port **3001** → **mock hit directly** (not via Vite).
 * 5. Else → `Unknown` (need the real URL from DevTools).
 */

export const PLATFORM_ANCHOR =
  'docs/PLATFORM.md#diagnosing-api-and-database-failures';

/**
 * Map a URL or path string to a **layer label** and a one-line **debug hint**.
 *
 * @param {string} raw - Pasted URL, path (`/api/...`), or host-like string; surrounding whitespace is trimmed.
 * @returns {{ label: string; detail: string }}
 *   - **label** — Short category: `Mock API (Vite proxy → :3001)`, `PostgREST / RLS`, `Edge Function`, `Supabase (other)`, `Unknown`.
 *   - **detail** — What to verify next (mock running, JWT/RLS, deploy/secrets/CORS, etc.).
 */
export function classifyApiLayer(raw) {
  const s = raw.trim();
  if (!s) {
    return {
      label: 'Unknown',
      detail: 'Empty input — paste a full URL or a path like /api/products.',
    };
  }

  let host = '';
  let pathname = '';

  try {
    if (s.startsWith('http://') || s.startsWith('https://')) {
      const u = new URL(s);
      host = u.host;
      pathname = u.pathname || '/';
    } else if (s.startsWith('/')) {
      // SPA-relative path: mock routes are proxied by Vite/preview from the SPA origin (see vite.config.ts).
      pathname = s.split(/[?#]/)[0] || '/';
    } else {
      // e.g. "project.supabase.co/rest/v1/table" → treat as HTTPS
      const u = new URL(`https://${s}`);
      host = u.host;
      pathname = u.pathname || '/';
    }
  } catch {
    return {
      label: 'Unknown',
      detail:
        'Could not parse input — use a full http(s) URL or a path starting with /.',
    };
  }

  if (host.includes('supabase.co')) {
    if (pathname.includes('/rest/v1') || pathname.startsWith('/rest/v1')) {
      return {
        label: 'PostgREST / RLS',
        detail:
          'Browser REST calls to Postgres via PostgREST; check JWT, guest headers, and RLS policies.',
      };
    }
    if (
      pathname.includes('/functions/v1') ||
      pathname.startsWith('/functions/v1')
    ) {
      return {
        label: 'Edge Function',
        detail:
          'Supabase Edge (Deno); check deploy, secrets, CORS, and request body.',
      };
    }
    return {
      label: 'Supabase (other)',
      detail:
        'Supabase host but not /rest/v1 or /functions/v1 — open URL path in dashboard or docs.',
    };
  }

  const port3001 =
    /^localhost:3001$/i.test(host) ||
    /^127\.0\.0\.1:3001$/i.test(host) ||
    /:3001$/i.test(host);

  if (
    pathname.startsWith('/api') ||
    pathname === '/health' ||
    pathname.startsWith('/health/')
  ) {
    return {
      label: 'Mock API (Vite proxy → :3001)',
      detail:
        'Same origin /api and /health; ensure pnpm run start:api is running.',
    };
  }

  if (port3001) {
    return {
      label: 'Mock API (direct :3001)',
      detail: 'Hits json-server / Express mock on port 3001.',
    };
  }

  return {
    label: 'Unknown',
    detail:
      'Not recognized as mock path, :3001, or supabase.co REST/Edge — paste the full request URL.',
  };
}
