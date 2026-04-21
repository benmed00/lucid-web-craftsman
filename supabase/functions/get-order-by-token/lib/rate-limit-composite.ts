/**
 * Composite rate-limit store: try `primary` first, fall back to `fallback`
 * on any error. Production wiring uses Postgres-primary with an in-memory
 * fallback so a DB outage degrades to the (weaker but functional)
 * per-isolate limit instead of 5xx-ing the client.
 *
 * The fallback is intentionally per-isolate. If the DB is down, we accept
 * that the cross-isolate guarantee is temporarily lost; what we refuse to
 * do is break the request path.
 */
import type { RateLimitOptions, RateLimitResult, RateLimitStore } from './rate-limit.ts';

export interface CompositeOptions {
  /** Optional hook fired when the primary fails and we fall back. */
  onFallback?: (err: unknown) => void;
}

export function createCompositeRateLimitStore(
  primary: RateLimitStore,
  fallback: RateLimitStore,
  opts: CompositeOptions = {}
): RateLimitStore {
  return {
    async consume(
      identifier: string,
      rateOpts: RateLimitOptions
    ): Promise<RateLimitResult> {
      try {
        return await primary.consume(identifier, rateOpts);
      } catch (err) {
        opts.onFallback?.(err);
        return fallback.consume(identifier, rateOpts);
      }
    },
  };
}
