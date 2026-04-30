/**
 * Cross-function rate-limit primitives.
 *
 * Shared by `get-order-by-token` (per `order_id`) and
 * `order-confirmation-lookup` (per `oid` from the HMAC token payload).
 *
 * This module defines the store interface and ships the **in-memory**
 * implementation. A Postgres-backed store lives in `./rate-limit-postgres.ts`;
 * the composite wrapper (DB-primary, memory-fallback) is in
 * `./rate-limit-composite.ts`.
 *
 * Production wiring happens in each edge function's `index.ts` — tests get
 * the memory store and a `__resetRateLimitStore()` escape hatch so state
 * doesn't leak across runs.
 */

export interface RateLimitOptions {
  /** Max attempts allowed per window. */
  maxAttempts: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Epoch ms at which the current window resets. */
  resetMs: number;
}

/**
 * Store contract — every backend (memory, Postgres, composite) implements
 * exactly this method. Async so a network-backed impl fits without casts.
 */
export interface RateLimitStore {
  consume(identifier: string, opts: RateLimitOptions): Promise<RateLimitResult>;
}

// ---------------------------------------------------------------------------
// In-memory store — module-level Map, scoped to one V8 isolate.
// ---------------------------------------------------------------------------

type MemoryRecord = { count: number; resetTime: number };

const memoryMap: Map<string, MemoryRecord> = new Map();

export const memoryRateLimitStore: RateLimitStore = {
  consume(
    identifier: string,
    opts: RateLimitOptions
  ): Promise<RateLimitResult> {
    return Promise.resolve(checkRateLimit(identifier, opts));
  },
};

/**
 * Synchronous convenience — delegates to the module-level memory store.
 * Kept for backwards compatibility with callers that can't `await`; prefer
 * the store interface for new code.
 */
export function checkRateLimit(
  identifier: string,
  opts: RateLimitOptions
): RateLimitResult {
  const now: number = Date.now();
  const record: MemoryRecord | undefined = memoryMap.get(identifier);

  if (!record || now > record.resetTime) {
    const resetTime: number = now + opts.windowMs;
    memoryMap.set(identifier, { count: 1, resetTime });
    return {
      allowed: true,
      remaining: opts.maxAttempts - 1,
      resetMs: resetTime,
    };
  }
  if (record.count >= opts.maxAttempts) {
    return { allowed: false, remaining: 0, resetMs: record.resetTime };
  }
  record.count += 1;
  return {
    allowed: true,
    remaining: opts.maxAttempts - record.count,
    resetMs: record.resetTime,
  };
}

/**
 * Factory for isolated in-memory stores (own Map). Use in tests that want
 * full isolation from the module-level default, or in composite wiring.
 */
export function createMemoryRateLimitStore(): RateLimitStore {
  const local: Map<string, MemoryRecord> = new Map();
  const sync = (
    identifier: string,
    opts: RateLimitOptions
  ): RateLimitResult => {
    const now: number = Date.now();
    const record: MemoryRecord | undefined = local.get(identifier);
    if (!record || now > record.resetTime) {
      const resetTime: number = now + opts.windowMs;
      local.set(identifier, { count: 1, resetTime });
      return {
        allowed: true,
        remaining: opts.maxAttempts - 1,
        resetMs: resetTime,
      };
    }
    if (record.count >= opts.maxAttempts) {
      return { allowed: false, remaining: 0, resetMs: record.resetTime };
    }
    record.count += 1;
    return {
      allowed: true,
      remaining: opts.maxAttempts - record.count,
      resetMs: record.resetTime,
    };
  };
  return {
    consume: (identifier, opts) => Promise.resolve(sync(identifier, opts)),
  };
}

/** Test-only: clear the module-level memory store between runs. */
export function __resetRateLimitStore(): void {
  memoryMap.clear();
}
