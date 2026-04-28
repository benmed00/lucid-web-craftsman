/** Shared checkout return-origin validation for payment Edge Functions. */

let productionOriginCache: string | null = null;

export function resolveProductionOrigin(): string {
  if (productionOriginCache === null) {
    productionOriginCache = (
      Deno.env.get('SITE_URL') || 'https://www.rifelegance.com'
    ).replace(/\/+$/, '');
  }
  return productionOriginCache;
}

const ALLOWED_ORIGINS: string[] = [
  'https://www.rifelegance.com',
  'https://rifelegance.com',
  'https://rif-raw-straw.lovable.app',
  'https://id-preview--1ed5c182-2490-4180-9969-ca6a7e19e8ca.lovable.app',
];

function normalizeRequestOrigin(req: Request): string | null {
  const raw =
    req.headers.get('Origin')?.trim() || req.headers.get('Referer')?.trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return `${u.protocol}//${u.host}`.replace(/\/+$/, '');
  } catch {
    return null;
  }
}

function isLocalDevOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    return (
      u.protocol === 'http:' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname)
    );
  } catch {
    return false;
  }
}

function isPrivateLanHttpOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    if (u.protocol !== 'http:') return false;
    const parts = u.hostname.split('.').map(Number);
    if (
      parts.length !== 4 ||
      parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)
    )
      return false;
    const [a, b] = parts;
    return (
      a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
    );
  } catch {
    return false;
  }
}

function checkoutExtraOriginsFromEnv(): string[] {
  const raw = Deno.env.get('CHECKOUT_EXTRA_ORIGINS')?.trim();
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .flatMap((s) => {
      try {
        const u = new URL(s.includes('://') ? s : `https://${s}`);
        return [`${u.protocol}//${u.host}`.replace(/\/+$/, '')];
      } catch {
        return [];
      }
    });
}

export function getValidOrigin(req: Request): string {
  const candidate = normalizeRequestOrigin(req);
  if (
    candidate &&
    (ALLOWED_ORIGINS.includes(candidate) ||
      isLocalDevOrigin(candidate) ||
      isPrivateLanHttpOrigin(candidate) ||
      checkoutExtraOriginsFromEnv().includes(candidate))
  ) {
    return candidate;
  }
  return resolveProductionOrigin();
}
