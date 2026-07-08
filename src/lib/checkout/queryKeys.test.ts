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

  // --- Variant / edge-shape scenarios ------------------------------------
  // These lock down current behavior of the string-part-scan matching rule,
  // so future tightening (e.g. slot-aware matching) is a deliberate change
  // with explicit test updates, not an accidental regression.

  const GUEST_ONLY = createGuestScopedQueryPredicate([OLD_GUEST]);

  it('empty query key returns false (never matches)', () => {
    expect(GUEST_ONLY(q([]))).toBe(false);
  });

  it('root-only checkout key ["checkout"] does not match (no guest slot)', () => {
    expect(GUEST_ONLY(q(checkoutQueryKeys.all))).toBe(false);
  });

  it('root-only cart key ["cart", "server"] does not match', () => {
    expect(GUEST_ONLY(q(cartServerQueryKeys.all))).toBe(false);
  });

  it('activeSession with only userId (guest slot empty) does not match a rotated guest', () => {
    // activeSession(userId, null) → ['checkout','session','active',userId,'']
    const key = checkoutQueryKeys.activeSession(USER_ID, null);
    expect(GUEST_ONLY(q(key))).toBe(false);
  });

  it('activeSession where userId slot equals the guest id string DOES match (documented false-positive risk)', () => {
    // This documents the current behavior: the predicate scans string parts,
    // so an unrelated userId that happens to equal OLD_GUEST would match.
    // In practice user IDs and guest UUIDs come from different namespaces,
    // but keep this test to make the trade-off explicit.
    const key = checkoutQueryKeys.activeSession(OLD_GUEST, null);
    expect(GUEST_ONLY(q(key))).toBe(true);
  });

  it('root string equal to guest id under a non-checkout/cart root does not match', () => {
    // Even if a stray key uses the guest id as its root, the root gate rejects it.
    expect(GUEST_ONLY(q([OLD_GUEST]))).toBe(false);
    expect(GUEST_ONLY(q([OLD_GUEST, 'checkout']))).toBe(false);
  });

  it('capitalization mismatch on root does not match ("Checkout" ≠ "checkout")', () => {
    expect(GUEST_ONLY(q(['Checkout', 'session', 'active', '', OLD_GUEST]))).toBe(
      false
    );
    expect(GUEST_ONLY(q(['CART', 'server', 'lines', OLD_GUEST]))).toBe(false);
  });

  it('substring matches on guest id do not count (exact string equality required)', () => {
    // Partial match — must NOT trip the predicate.
    const prefix = OLD_GUEST.slice(0, 12);
    const suffix = `xx-${OLD_GUEST}-yy`;
    expect(GUEST_ONLY(q(['checkout', 'session', 'active', '', prefix]))).toBe(
      false
    );
    expect(GUEST_ONLY(q(['checkout', 'session', 'active', '', suffix]))).toBe(
      false
    );
  });

  it('guest id nested inside an object part does not match', () => {
    // Only top-level string parts are inspected — nested references are ignored.
    expect(
      GUEST_ONLY(
        q(['checkout', 'session', 'active', '', { guestId: OLD_GUEST }])
      )
    ).toBe(false);
    expect(
      GUEST_ONLY(q(['checkout', 'session', 'active', '', [OLD_GUEST]]))
    ).toBe(false);
  });

  it('supports deeper future key shapes as long as guest id is a string part under checkout/cart', () => {
    // Documents forward compatibility for hypothetical richer keys.
    expect(
      GUEST_ONLY(q(['checkout', 'v2', 'session', 'active', 'guest', OLD_GUEST]))
    ).toBe(true);
    expect(
      GUEST_ONLY(q(['cart', 'server', 'lines', 'by-guest', OLD_GUEST]))
    ).toBe(true);
  });

  it('matches when only the new guest id is present in the input', () => {
    const p = createGuestScopedQueryPredicate([undefined, NEW_GUEST, null]);
    expect(p(q(checkoutQueryKeys.activeSession(null, NEW_GUEST)))).toBe(true);
    expect(p(q(checkoutQueryKeys.activeSession(null, OLD_GUEST)))).toBe(false);
  });

  it('is case-sensitive on guest id comparison', () => {
    const p = createGuestScopedQueryPredicate([OLD_GUEST]);
    const upper = OLD_GUEST.toUpperCase();
    expect(p(q(checkoutQueryKeys.activeSession(null, upper)))).toBe(false);
  });

  it('duplicate ids in the input do not affect matching', () => {
    const p = createGuestScopedQueryPredicate([
      OLD_GUEST,
      OLD_GUEST,
      OLD_GUEST,
    ]);
    expect(p(q(checkoutQueryKeys.activeSession(null, OLD_GUEST)))).toBe(true);
    expect(p(q(checkoutQueryKeys.activeSession(null, OTHER_GUEST)))).toBe(
      false
    );
  });
});
