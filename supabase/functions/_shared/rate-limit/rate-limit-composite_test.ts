import { assertEquals } from '@std/assert';
import { createCompositeRateLimitStore } from './rate-limit-composite.ts';
import type { RateLimitStore } from './rate-limit.ts';

function stubStore(
  impl: (
    id: string,
    opts: { maxAttempts: number; windowMs: number }
  ) =>
    | Promise<{ allowed: boolean; remaining: number; resetMs: number }>
    | { allowed: boolean; remaining: number; resetMs: number }
): RateLimitStore {
  return {
    consume: (id, opts) => Promise.resolve(impl(id, opts)),
  };
}

const OPTS = { maxAttempts: 20, windowMs: 60_000 } as const;

Deno.test(
  'composite: primary success short-circuits the fallback',
  async () => {
    let fallbackCalls = 0;
    const store = createCompositeRateLimitStore(
      stubStore(() => ({ allowed: true, remaining: 10, resetMs: 111 })),
      stubStore(() => {
        fallbackCalls++;
        return { allowed: true, remaining: 99, resetMs: 222 };
      })
    );
    const res = await store.consume('order:a', OPTS);
    assertEquals(res, { allowed: true, remaining: 10, resetMs: 111 });
    assertEquals(fallbackCalls, 0);
  }
);

Deno.test(
  'composite: primary throw → fallback consulted, onFallback fires',
  async () => {
    const caught: unknown[] = [];
    let fallbackCalls = 0;
    const store = createCompositeRateLimitStore(
      stubStore(() => Promise.reject(new Error('pg down'))),
      stubStore(() => {
        fallbackCalls++;
        return { allowed: true, remaining: 5, resetMs: 333 };
      }),
      { onFallback: (err) => caught.push(err) }
    );
    const res = await store.consume('order:b', OPTS);
    assertEquals(res, { allowed: true, remaining: 5, resetMs: 333 });
    assertEquals(fallbackCalls, 1);
    assertEquals(caught.length, 1);
    assertEquals((caught[0] as Error).message, 'pg down');
  }
);

Deno.test('composite: onFallback optional (no throw if omitted)', async () => {
  const store = createCompositeRateLimitStore(
    stubStore(() => Promise.reject(new Error('boom'))),
    stubStore(() => ({ allowed: true, remaining: 1, resetMs: 444 }))
  );
  const res = await store.consume('order:c', OPTS);
  assertEquals(res.allowed, true);
});
