import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpcMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: rpcMock },
}));

import {
  resolveCartSyncPolicy,
  isSupabaseCartSyncAllowed,
  isElevatedStorefrontUser,
  isWishlistCloudSyncAllowed,
  getCartPersistStorageName,
  invalidateCartSyncPolicyCache,
  resetCartSyncPolicyStateForTests,
} from './cartSyncPolicy';

const SAMPLE_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('cartSyncPolicy', () => {
  beforeEach(() => {
    resetCartSyncPolicyStateForTests();
    rpcMock.mockReset();
    sessionStorage.clear();
  });

  it('guest: after resolve, cart and wishlist cloud sync are allowed', async () => {
    await resolveCartSyncPolicy(null);
    expect(isSupabaseCartSyncAllowed()).toBe(true);
    expect(isElevatedStorefrontUser()).toBe(false);
    expect(isWishlistCloudSyncAllowed()).toBe(true);
    expect(getCartPersistStorageName()).toBe('cart-storage');
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('standard user (rpc false): cart sync allowed', async () => {
    rpcMock.mockResolvedValue({ data: false, error: null });
    await resolveCartSyncPolicy(SAMPLE_USER_ID);
    expect(isElevatedStorefrontUser()).toBe(false);
    expect(isSupabaseCartSyncAllowed()).toBe(true);
    expect(rpcMock).toHaveBeenCalledWith('is_admin_user', {
      user_uuid: SAMPLE_USER_ID,
    });
  });

  it('elevated user (rpc true): no cart DB sync, no wishlist cloud', async () => {
    rpcMock.mockResolvedValue({ data: true, error: null });
    await resolveCartSyncPolicy(SAMPLE_USER_ID);
    expect(isElevatedStorefrontUser()).toBe(true);
    expect(isSupabaseCartSyncAllowed()).toBe(false);
    expect(isWishlistCloudSyncAllowed()).toBe(false);
    expect(getCartPersistStorageName()).toBe('cart-storage-elevated');
  });

  it('RPC error: treat as non-elevated', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'rpc failed' } });
    await resolveCartSyncPolicy(SAMPLE_USER_ID);
    expect(isElevatedStorefrontUser()).toBe(false);
    expect(isSupabaseCartSyncAllowed()).toBe(true);
  });

  it('second resolve with same userId does not call RPC again (sessionStorage cache)', async () => {
    rpcMock.mockResolvedValue({ data: true, error: null });
    await resolveCartSyncPolicy(SAMPLE_USER_ID);
    expect(rpcMock).toHaveBeenCalledTimes(1);
    resetCartSyncPolicyStateForTests();
    await resolveCartSyncPolicy(SAMPLE_USER_ID);
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(isElevatedStorefrontUser()).toBe(true);
  });

  it('dedupes concurrent resolve for the same user (single RPC)', async () => {
    let release!: () => void;
    const barrier = new Promise<void>((r) => {
      release = r;
    });
    rpcMock.mockImplementation(() =>
      barrier.then(() => Promise.resolve({ data: false, error: null }))
    );
    const a = resolveCartSyncPolicy(SAMPLE_USER_ID);
    const b = resolveCartSyncPolicy(SAMPLE_USER_ID);
    expect(rpcMock).toHaveBeenCalledTimes(1);
    release!();
    await Promise.all([a, b]);
    expect(isSupabaseCartSyncAllowed()).toBe(true);
  });

  it('invalidateCartSyncPolicyCache clears sessionStorage policy keys', async () => {
    rpcMock.mockResolvedValue({ data: false, error: null });
    await resolveCartSyncPolicy(SAMPLE_USER_ID);
    expect(
      sessionStorage.getItem(`cart_sync_policy_v1:${SAMPLE_USER_ID}`)
    ).toBeTruthy();
    invalidateCartSyncPolicyCache();
    expect(
      sessionStorage.getItem(`cart_sync_policy_v1:${SAMPLE_USER_ID}`)
    ).toBeNull();
  });
});
