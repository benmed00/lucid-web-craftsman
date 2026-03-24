/**
 * StorageGuard — Production-grade self-healing persisted state manager.
 *
 * Responsibilities:
 * 1. Pre-hydration JSON validation for all persisted Zustand stores
 * 2. Schema-aware migration & sanitization
 * 3. Hydration watchdog (timeout-based recovery)
 * 4. Safari/private-browsing resilience
 * 5. Diagnostic logging for post-mortem analysis
 */

// ============= Types =============

interface StoreSchema {
  key: string;
  /** Validate the `state` object inside `{ state, version }` wrapper */
  validate: (state: unknown) => boolean;
  /** Default state to write when validation fails */
  defaultState: Record<string, unknown>;
  /** Current expected version */
  version: number;
}

interface DiagnosticEntry {
  key: string;
  action: 'cleared' | 'migrated' | 'watchdog_reset' | 'boundary_reset';
  reason: string;
  timestamp: number;
}

// ============= Diagnostic Log =============

const diagnosticLog: DiagnosticEntry[] = [];

function logDiagnostic(entry: Omit<DiagnosticEntry, 'timestamp'>) {
  const full = { ...entry, timestamp: Date.now() };
  diagnosticLog.push(full);
  console.warn(
    `[StorageGuard] ${entry.action}: "${entry.key}" — ${entry.reason}`
  );
}

export function getDiagnosticLog(): ReadonlyArray<DiagnosticEntry> {
  return diagnosticLog;
}

// ============= Storage Availability =============

let _storageAvailable: boolean | null = null;

export function isLocalStorageAvailable(): boolean {
  if (_storageAvailable !== null) return _storageAvailable;
  try {
    const testKey = '__sg_test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    _storageAvailable = true;
  } catch {
    _storageAvailable = false;
    console.warn('[StorageGuard] localStorage unavailable (private browsing?)');
  }
  return _storageAvailable;
}

// ============= Safe localStorage wrapper =============

function safeGetRaw(key: string): string | null {
  if (!isLocalStorageAvailable()) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeRemove(key: string): void {
  if (!isLocalStorageAvailable()) return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

// ============= Store Schemas =============

const STORE_SCHEMAS: StoreSchema[] = [
  {
    key: 'cart-storage',
    version: 2,
    defaultState: { items: [], offlineQueue: [] },
    validate: (state: unknown) => {
      if (!state || typeof state !== 'object') return false;
      const s = state as Record<string, unknown>;
      return Array.isArray(s.items);
    },
  },
  {
    key: 'cart-storage-elevated',
    version: 2,
    defaultState: { items: [], offlineQueue: [] },
    validate: (state: unknown) => {
      if (!state || typeof state !== 'object') return false;
      const s = state as Record<string, unknown>;
      return Array.isArray(s.items);
    },
  },
  {
    key: 'currency-storage',
    version: 1,
    defaultState: { currency: 'EUR' },
    validate: (state: unknown) => {
      if (!state || typeof state !== 'object') return false;
      const s = state as Record<string, unknown>;
      return (
        typeof s.currency === 'string' &&
        ['EUR', 'USD', 'GBP', 'MAD'].includes(s.currency as string)
      );
    },
  },
  {
    key: 'rif-raw-straw-theme',
    version: 1,
    defaultState: { theme: 'system' },
    validate: (state: unknown) => {
      if (!state || typeof state !== 'object') return false;
      const s = state as Record<string, unknown>;
      return (
        typeof s.theme === 'string' &&
        ['light', 'dark', 'system'].includes(s.theme as string)
      );
    },
  },
  {
    key: 'language-storage',
    version: 1,
    defaultState: { locale: 'fr' },
    validate: (state: unknown) => {
      if (!state || typeof state !== 'object') return false;
      const s = state as Record<string, unknown>;
      return (
        typeof s.locale === 'string' &&
        ['fr', 'en', 'ar'].includes(s.locale as string)
      );
    },
  },
];

// Non-Zustand keys that also need validation
const EXTRA_KEYS: { key: string; validate: (parsed: unknown) => boolean }[] = [
  {
    key: 'rif_hero_image_cache',
    validate: (parsed: unknown) => {
      if (!parsed || typeof parsed !== 'object') return false;
      const p = parsed as Record<string, unknown>;
      return typeof p.imageUrl === 'string' && typeof p.title === 'string';
    },
  },
];

// ============= Core Validation =============

/**
 * Validate and sanitize all persisted stores BEFORE React renders.
 * Call this synchronously in main.tsx before createRoot().
 *
 * Returns the number of keys that were repaired.
 */
export function validateAndSanitizeStorage(): number {
  if (!isLocalStorageAvailable()) return 0;

  let repaired = 0;

  for (const schema of STORE_SCHEMAS) {
    const raw = safeGetRaw(schema.key);
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);

      // Zustand persist format: { state: {...}, version: number }
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Not an object');
      }

      // Missing state wrapper → invalid
      if (!('state' in parsed)) {
        throw new Error('Missing state wrapper');
      }

      // Version mismatch — let Zustand's migrate handle it, but validate state shape
      if (!schema.validate(parsed.state)) {
        // Write corrected default
        const corrected = JSON.stringify({
          state: schema.defaultState,
          version: schema.version,
        });
        localStorage.setItem(schema.key, corrected);
        logDiagnostic({
          key: schema.key,
          action: 'migrated',
          reason: 'State validation failed, reset to defaults',
        });
        repaired++;
        continue;
      }

      // Safari truncation check: verify the JSON round-trips cleanly
      const reStringified = JSON.stringify(parsed);
      if (reStringified.length < raw.length * 0.5) {
        // Suspiciously shorter — possible truncation
        throw new Error('Possible Safari truncation detected');
      }
    } catch (err) {
      safeRemove(schema.key);
      logDiagnostic({
        key: schema.key,
        action: 'cleared',
        reason: err instanceof Error ? err.message : 'Invalid JSON',
      });
      repaired++;
    }
  }

  // Validate extra keys
  for (const { key, validate } of EXTRA_KEYS) {
    const raw = safeGetRaw(key);
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);
      if (!validate(parsed)) {
        throw new Error('Schema validation failed');
      }
    } catch (err) {
      safeRemove(key);
      logDiagnostic({
        key,
        action: 'cleared',
        reason: err instanceof Error ? err.message : 'Invalid JSON',
      });
      repaired++;
    }
  }

  // Also check for potentially stale Supabase auth tokens
  // A bad JWT will poison ALL requests (even anonymous ones) with 401
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('sb-')) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        // Supabase stores session as { access_token, refresh_token, ... }
        // or { currentSession: { access_token, ... } }
        const token =
          parsed?.access_token || parsed?.currentSession?.access_token;
        if (token && typeof token === 'string') {
          // Quick JWT expiry check (decode payload without verification)
          const parts = token.split('.');
          if (parts.length === 3) {
            try {
              const payload = JSON.parse(atob(parts[1]));
              if (payload.exp && payload.exp * 1000 < Date.now()) {
                console.warn(
                  `[StorageGuard] Expired JWT found in "${key}", removing`
                );
                safeRemove(key);
                logDiagnostic({
                  key,
                  action: 'cleared',
                  reason: 'Expired JWT token',
                });
                repaired++;
              }
            } catch {
              // Malformed JWT payload — remove it
              console.warn(
                `[StorageGuard] Malformed JWT in "${key}", removing`
              );
              safeRemove(key);
              logDiagnostic({
                key,
                action: 'cleared',
                reason: 'Malformed JWT token',
              });
              repaired++;
            }
          }
        }
      } catch {
        // Not JSON — ignore
      }
    }
  } catch {
    // Storage enumeration failed — ignore
  }

  if (repaired > 0) {
    console.info(`[StorageGuard] Repaired ${repaired} persisted store(s)`);
  }

  return repaired;
}

// ============= Hydration Watchdog =============

let watchdogTimer: ReturnType<typeof setTimeout> | null = null;
let watchdogResolved = false;

/**
 * Start a watchdog timer. If `resolveHydrationWatchdog()` is not called
 * within `timeoutMs`, all persisted stores are purged and the page reloads.
 */
export function startHydrationWatchdog(timeoutMs = 4000): void {
  watchdogResolved = false;

  watchdogTimer = setTimeout(() => {
    if (watchdogResolved) return;

    console.error(
      `[StorageGuard] Hydration watchdog triggered after ${timeoutMs}ms — purging all stores`
    );

    purgeAllPersistedStores(
      'watchdog_reset',
      `Hydration exceeded ${timeoutMs}ms`
    );

    // Reload the page to get a clean start
    try {
      sessionStorage.setItem('__sg_watchdog_reload', '1');
    } catch {
      /* ignore */
    }

    window.location.reload();
  }, timeoutMs);
}

/**
 * Call this once the app has successfully rendered (e.g. in a useEffect in App).
 */
export function resolveHydrationWatchdog(): void {
  watchdogResolved = true;
  if (watchdogTimer) {
    clearTimeout(watchdogTimer);
    watchdogTimer = null;
  }
}

/**
 * Check if this page load was triggered by a watchdog reload.
 */
export function wasWatchdogReload(): boolean {
  try {
    const flag = sessionStorage.getItem('__sg_watchdog_reload');
    if (flag) {
      sessionStorage.removeItem('__sg_watchdog_reload');
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

// ============= Emergency Purge =============

/**
 * Purge all known persisted stores. Used by ErrorBoundary and watchdog.
 */
export function purgeAllPersistedStores(
  action: DiagnosticEntry['action'] = 'boundary_reset',
  reason = 'Emergency purge'
): void {
  const allKeys = [
    ...STORE_SCHEMAS.map((s) => s.key),
    ...EXTRA_KEYS.map((e) => e.key),
    'i18nextLng', // i18next's own key
  ];

  for (const key of allKeys) {
    safeRemove(key);
    logDiagnostic({ key, action, reason });
  }
}

/**
 * Detect if an error is likely caused by hydration / hook order issues.
 */
export function isHydrationError(error: Error): boolean {
  const msg = error.message || '';
  const hydrationPatterns = [
    'Rendered more hooks than during the previous render',
    'Rendered fewer hooks than expected',
    'Invalid hook call',
    'Cannot read properties of null',
    'Cannot read properties of undefined',
    'is not a function', // often from corrupted state
  ];
  return hydrationPatterns.some((p) => msg.includes(p));
}
