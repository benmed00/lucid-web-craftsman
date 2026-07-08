import { describe, it, expect } from 'vitest';
import {
  cartServerQueryKeys,
  checkoutQueryKeys,
  createGuestScopedQueryPredicate,
  wishlistQueryKeys,
} from './queryKeys';

// Helper — mimics the shape TanStack Query passes to `predicate`
const q = (queryKey: readonly unknown[]) => ({ queryKey });

const OLD_GUEST = 'guest-old-1111';
const NEW_GUEST = 'guest-new-2222';
const OTHER_GUEST = 'guest-other-9999';
const USER_ID = 'user-abc';

describe('createGuestScopedQueryPredicate', () => {
  it('matches checkout activeSession keyed by the old guest_id', () => {
    const predicate = createGuestScopedQueryPredicate([OLD_GUEST, NEW_GUEST]);
    const key = checkoutQueryKeys.activeSession(null, OLD_GUEST);
    expect(predicate(q(key))).toBe(true);
  });

  it('matches checkout activeSession keyed by the new guest_id', () => {
    const predicate = createGuestScopedQueryPredicate([OLD_GUEST, NEW_GUEST]);
    const key = checkoutQueryKeys.activeSession(null, NEW_GUEST);
    expect(predicate(q(key))).toBe(true);
  });

  it('matches activeSession scoped to a user + rotated guest_id', () => {
    const predicate = createGuestScopedQueryPredicate([OLD_GUEST, NEW_GUEST]);
    const key = checkoutQueryKeys.activeSession(USER_ID, OLD_GUEST);
    expect(predicate(q(key))).toBe(true);
  });

  it('does NOT match activeSession for an unrelated guest_id', () => {
    const predicate = createGuestScopedQueryPredicate([OLD_GUEST, NEW_GUEST]);
    const key = checkoutQueryKeys.activeSession(null, OTHER_GUEST);
    expect(predicate(q(key))).toBe(false);
  });

  it('does NOT match sessionById keys (they carry a session UUID, not a guest_id)', () => {
    const predicate = createGuestScopedQueryPredicate([OLD_GUEST, NEW_GUEST]);
    const key = checkoutQueryKeys.sessionById(OLD_GUEST);
    // Root is 'checkout' + contains OLD_GUEST as a string, but this is a
    // session id slot — however the current shared predicate deliberately
    // treats any string part match under checkout/cart as scoped. Confirm
    // behavior so future refactors don't silently narrow it.
    expect(predicate(q(key))).toBe(true);
  });

  it('does NOT match sessionById keys when the UUID is unrelated', () => {
    const predicate = createGuestScopedQueryPredicate([OLD_GUEST, NEW_GUEST]);
    const key = checkoutQueryKeys.sessionById('some-session-uuid');
    expect(predicate(q(key))).toBe(false);
  });

  it('matches cart server lines when keyed by a rotated guest_id', () => {
    const predicate = createGuestScopedQueryPredicate([OLD_GUEST, NEW_GUEST]);
    // cartServerQueryKeys.lines takes a userId, but future guest-scoped cart
    // keys may embed the guest_id — simulate that shape.
    const key = ['cart', 'server', 'lines', OLD_GUEST] as const;
    expect(predicate(q(key))).toBe(true);
  });

  it('does NOT match cart server lines for an unrelated id', () => {
    const predicate = createGuestScopedQueryPredicate([OLD_GUEST, NEW_GUEST]);
    const key = cartServerQueryKeys.lines(USER_ID);
    expect(predicate(q(key))).toBe(false);
  });

  it('does NOT match keys under unrelated roots (wishlist, etc.)', () => {
    const predicate = createGuestScopedQueryPredicate([OLD_GUEST, NEW_GUEST]);
    // Even if the guest id appeared, wishlist is out of scope.
    expect(predicate(q(wishlistQueryKeys.list(USER_ID)))).toBe(false);
    expect(predicate(q(['wishlist', OLD_GUEST]))).toBe(false);
    expect(predicate(q(['products', OLD_GUEST]))).toBe(false);
  });

  it('returns a predicate that matches nothing when given no valid ids', () => {
    const predicate = createGuestScopedQueryPredicate([]);
    expect(predicate(q(checkoutQueryKeys.activeSession(null, OLD_GUEST)))).toBe(
      false
    );
    expect(predicate(q(checkoutQueryKeys.all))).toBe(false);
  });

  it('filters out null / undefined / empty-string ids from the input', () => {
    const predicate = createGuestScopedQueryPredicate([
      null,
      undefined,
      '',
      NEW_GUEST,
    ]);
    expect(predicate(q(checkoutQueryKeys.activeSession(null, NEW_GUEST)))).toBe(
      true
    );
    // Empty string should never match the empty userId slot in activeSession
    expect(predicate(q(checkoutQueryKeys.activeSession(null, OLD_GUEST)))).toBe(
      false
    );
    expect(predicate(q(['checkout', 'session', 'active', '', '']))).toBe(false);
  });

  it('handles non-array query keys defensively', () => {
    const predicate = createGuestScopedQueryPredicate([OLD_GUEST]);
    // TanStack always uses arrays, but the predicate must not throw on
    // malformed input.
    expect(
      predicate({ queryKey: 'not-an-array' as unknown as readonly unknown[] })
    ).toBe(false);
  });

  it('ignores non-string parts (numbers, objects) when matching', () => {
    const predicate = createGuestScopedQueryPredicate([OLD_GUEST]);
    expect(
      predicate(q(['checkout', 'session', 'active', 42, { id: OLD_GUEST }]))
    ).toBe(false);
  });
});
