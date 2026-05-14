/**
 * useProfileActions — cached profile load/update helpers.
 *
 * Prerequisites: mocked profileApi.
 * Run: npx vitest run src/context/useProfileActions.test.tsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProfileActions, profileCache } from './useProfileManager';

const { fetchProfileFullById, updateProfileReturnRow } = vi.hoisted(() => ({
  fetchProfileFullById: vi.fn(),
  updateProfileReturnRow: vi.fn(),
}));

vi.mock('@/services/profileApi', () => ({
  fetchProfileFullById: (...a: unknown[]) => fetchProfileFullById(...a),
  updateProfileReturnRow: (...a: unknown[]) => updateProfileReturnRow(...a),
}));

describe('useProfileActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    profileCache.invalidate();
  });

  it('loadUserProfile fetches when cache is cold', async () => {
    const setProfile = vi.fn();
    fetchProfileFullById.mockResolvedValue({
      id: 'u1',
      full_name: 'Tester',
      email: 't@test.com',
    });

    const { result } = renderHook(() =>
      useProfileActions('u1', setProfile)
    );

    await act(async () => {
      await result.current.loadUserProfile('u1');
    });

    expect(fetchProfileFullById).toHaveBeenCalledWith('u1');
    expect(setProfile).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'u1', full_name: 'Tester' })
    );
  });

  it('loadUserProfile uses cache on second call for same user', async () => {
    const setProfile = vi.fn();
    fetchProfileFullById.mockResolvedValue({ id: 'u2', full_name: 'Cached' });

    const { result } = renderHook(() =>
      useProfileActions('u2', setProfile)
    );

    await act(async () => {
      await result.current.loadUserProfile('u2');
    });
    await act(async () => {
      await result.current.loadUserProfile('u2');
    });

    expect(fetchProfileFullById).toHaveBeenCalledTimes(1);
  });
});
