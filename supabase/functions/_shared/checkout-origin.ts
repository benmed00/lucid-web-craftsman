/** Shared request-origin allowlist for payment return URLs. */

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
  const raw: string | undefined =
    req.headers.get('Origin')?.trim() || req.headers.get('Referer')?.trim();
  if (!raw) return null;
  try {
    const u: URL = new URL(raw);
    return `${u.protocol}//${u.host}`.replace(/\/+$/, '');
  } catch {
    return null;
  }
}

function isLocalDevOrigin(origin: string): boolean {
  try {
    const u: URL = new URL(origin);
    if (u.protocol !== 'http:') return false;
    return (
      u.hostname === 'localhost' ||
      u.hostname === '127.0.0.1' ||
      u.hostname === '[::1]'
    );
  } catch {
    return false;
  }
}

function ipv4Octets(hostname: string): [number, number, number, number] | null {
  const m: RegExpExecArray | null =
    /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hostname);
  if (!m) return null;
  const parts: number[] = m.slice(1, 5).map((s) => Number(s));
  if (parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return [parts[0]!, parts[1]!, parts[2]!, parts[3]!];
}

function isPrivateLanHttpOrigin(origin: string): boolean {
  try {
    const u: URL = new URL(origin);
    if (u.protocol !== 'http:') return false;
    const o: [number, number, number, number] | null = ipv4Octets(u.hostname);
    if (!o) return false;
    const [a, b] = o;
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
  } catch {
    return false;
  }
}

function checkoutExtraOriginsFromEnv(): string[] {
  const raw: string | undefined = Deno.env
    .get('CHECKOUT_EXTRA_ORIGINS')
    ?.trim();
  if (!raw) return [];
  return raw
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean)
    .flatMap((s: string): string[] => {
      try {
        const u: URL = new URL(s.includes('://') ? s : `https://${s}`);
        return [`${u.protocol}//${u.host}`.replace(/\/+$/, '')];
      } catch {
        return [];
      }
    });
}

function isAllowedCheckoutOrigin(candidate: string): boolean {
  return (
    ALLOWED_ORIGINS.includes(candidate) ||
    isLocalDevOrigin(candidate) ||
    isPrivateLanHttpOrigin(candidate) ||
    checkoutExtraOriginsFromEnv().includes(candidate)
  );
}

export function getValidOrigin(req: Request): string {
  const candidate: string | null = normalizeRequestOrigin(req);
  if (candidate !== null && isAllowedCheckoutOrigin(candidate)) {
    return candidate;
  }
  return resolveProductionOrigin();
}