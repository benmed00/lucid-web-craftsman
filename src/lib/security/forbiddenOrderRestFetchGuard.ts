/**
 * Blocks direct PostgREST reads of `orders` / `order_items` while the user is on
 * public order-success surfaces. Admin, profile order history, and the rest of
 * the storefront keep using the normal Supabase client (enforcement is pathname-scoped).
 */

function isPublicOrderDataIsolationSurface(): boolean {
  if (typeof window === 'undefined') return false;
  const p = window.location.pathname;
  return (
    p.startsWith('/order-confirmation') ||
    p.startsWith('/payment-success') ||
    p.startsWith('/invoice')
  );
}

function resolveFetchUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  if (typeof Request !== 'undefined' && input instanceof Request) return input.url;
  return '';
}

/** PostgREST collection paths only — avoids matching e.g. `/rest/v1/orders_stats`. */
function isForbiddenOrdersRestPath(absoluteUrl: string): boolean {
  try {
    const u = new URL(absoluteUrl, 'https://invalid.local');
    const p = u.pathname.replace(/\/+$/, '');
    return p === '/rest/v1/orders' || p === '/rest/v1/order_items';
  } catch {
    return false;
  }
}

let installed = false;

/** Vitest only — allows re-installing after `fetch` is restored. */
export function resetForbiddenOrderRestFetchGuardForTests(): void {
  installed = false;
}

export function installForbiddenOrderRestFetchGuard(): void {
  if (typeof window === 'undefined' || installed) return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const raw = resolveFetchUrl(args[0]);
    if (!raw || !isPublicOrderDataIsolationSurface()) {
      return originalFetch(...args);
    }

    let absolute: string;
    try {
      absolute = new URL(raw, window.location.origin).href;
    } catch {
      return originalFetch(...args);
    }

    if (isForbiddenOrdersRestPath(absolute)) {
      console.error('[CRITICAL] Forbidden DB call detected', { url: absolute });
      throw new Error('Forbidden direct DB access in public flow');
    }

    return originalFetch(...args);
  };
}
