/**
 * Property-based / fuzz tests for createGuestScopedQueryPredicate.
 *
 * Contract we're stress-testing:
 *   1. NO false positives: if none of the string parts of the query key
 *      are exactly equal to a supplied guest_id, the predicate returns false.
 *   2. Root gate: any query key whose first element is not the literal
 *      string 'checkout' or 'cart' returns false, even if a guest_id is
 *      embedded elsewhere.
 *   3. Positive matching only requires ONE string part equal to a guest_id
 *      under a valid root.
 *
 * Run: bunx vitest run src/lib/checkout/queryKeys.fuzz.test.ts
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { createGuestScopedQueryPredicate } from './queryKeys';

const guestIdArb = fc.uuid();

// Arbitrary query-key parts: strings, numbers, booleans, null, undefined,
// small nested objects/arrays. Deliberately excludes exact guest_id shape.
const nonGuestPartArb = fc.oneof(
  fc
    .string({ minLength: 0, maxLength: 40 })
    // Filter to values that cannot collide with any UUID
    .filter((s) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)),
  fc.integer(),
  fc.boolean(),
  fc.constant(null),
  fc.constant(undefined),
  fc.record({ id: fc.string(), n: fc.integer() }),
  fc.array(fc.string(), { maxLength: 3 })
);

const rootArb = fc.oneof(
  fc.constant('checkout'),
  fc.constant('cart'),
  fc.constant('wishlist'),
  fc.constant('products'),
  fc.constant('orders'),
  fc.constant('Checkout'), // wrong case — must not gate through
  fc.string({ minLength: 1, maxLength: 12 })
);

describe('createGuestScopedQueryPredicate — fuzz', () => {
  it('no false positives: keys with no exact guest_id string part never match', () => {
    fc.assert(
      fc.property(
        fc.array(guestIdArb, { minLength: 1, maxLength: 4 }),
        rootArb,
        fc.array(nonGuestPartArb, { minLength: 0, maxLength: 8 }),
        (guestIds, root, tail) => {
          const guestSet = new Set(guestIds);
          const key = [root, ...tail];
          // Ensure no part accidentally equals a guest_id
          const hasCollision = key.some(
            (p) => typeof p === 'string' && guestSet.has(p)
          );
          fc.pre(!hasCollision);

          const predicate = createGuestScopedQueryPredicate(guestIds);
          expect(predicate({ queryKey: key })).toBe(false);
        }
      ),
      { numRuns: 500 }
    );
  });

  it('root gate: non-checkout/cart roots never match, even when a guest_id is embedded', () => {
    fc.assert(
      fc.property(
        guestIdArb,
        fc
          .string({ minLength: 1, maxLength: 12 })
          .filter((s) => s !== 'checkout' && s !== 'cart'),
        fc.array(nonGuestPartArb, { minLength: 0, maxLength: 6 }),
        fc.nat(6),
        (guestId, root, tail, insertAt) => {
          const parts: unknown[] = [root, ...tail];
          const idx = Math.min(insertAt, parts.length);
          parts.splice(idx, 0, guestId);

          const predicate = createGuestScopedQueryPredicate([guestId]);
          expect(predicate({ queryKey: parts })).toBe(false);
        }
      ),
      { numRuns: 500 }
    );
  });

  it('positive: any checkout/cart key with the guest_id as a string part matches', () => {
    fc.assert(
      fc.property(
        guestIdArb,
        fc.oneof(fc.constant('checkout'), fc.constant('cart')),
        fc.array(nonGuestPartArb, { minLength: 0, maxLength: 6 }),
        fc.nat(6),
        (guestId, root, tail, insertAt) => {
          const parts: unknown[] = [root, ...tail];
          const idx = Math.min(insertAt, parts.length - 1) + 1; // insert AFTER root
          parts.splice(idx, 0, guestId);

          const predicate = createGuestScopedQueryPredicate([guestId]);
          expect(predicate({ queryKey: parts })).toBe(true);
        }
      ),
      { numRuns: 500 }
    );
  });

  it('empty / invalid guest_id inputs always yield a predicate that returns false', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            fc.constant(''),
          ),
          { minLength: 0, maxLength: 5 }
        ),
        fc.array(fc.anything(), { minLength: 0, maxLength: 6 }),
        (invalidIds, anyKey) => {
          const predicate = createGuestScopedQueryPredicate(invalidIds);
          expect(predicate({ queryKey: anyKey as readonly unknown[] })).toBe(
            false
          );
        }
      ),
      { numRuns: 200 }
    );
  });

  it('never throws on adversarial query-key shapes', () => {
    fc.assert(
      fc.property(
        fc.array(guestIdArb, { minLength: 0, maxLength: 3 }),
        fc.anything(),
        (guestIds, anyKey) => {
          const predicate = createGuestScopedQueryPredicate(guestIds);
          expect(() =>
            predicate({ queryKey: anyKey as readonly unknown[] })
          ).not.toThrow();
        }
      ),
      { numRuns: 500 }
    );
  });
});
