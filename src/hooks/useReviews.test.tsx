/**
 * Tests for useReviews (fetch + submit + mark helpful, gated by useAuth).
 *
 * Prerequisites: mocked reviewsApi + AuthContext + sonner toast.
 * Run: npx vitest run src/hooks/useReviews.test.tsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const {
  fetchApprovedReviewsForProduct,
  fetchReviewHelpfulCount,
  fetchUserReviewForProduct,
  incrementReviewHelpfulCount,
  insertProductReview,
  useAuthMock,
  toastError,
  toastSuccess,
} = vi.hoisted(() => ({
  fetchApprovedReviewsForProduct: vi.fn(),
  fetchReviewHelpfulCount: vi.fn(),
  fetchUserReviewForProduct: vi.fn(),
  incrementReviewHelpfulCount: vi.fn(),
  insertProductReview: vi.fn(),
  useAuthMock: vi.fn<() => { user: { id: string } | null }>(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock('@/services/reviewsApi', () => ({
  fetchApprovedReviewsForProduct: (...a: unknown[]) =>
    fetchApprovedReviewsForProduct(...a),
  fetchReviewHelpfulCount: (...a: unknown[]) => fetchReviewHelpfulCount(...a),
  fetchUserReviewForProduct: (...a: unknown[]) =>
    fetchUserReviewForProduct(...a),
  incrementReviewHelpfulCount: (...a: unknown[]) =>
    incrementReviewHelpfulCount(...a),
  insertProductReview: (...a: unknown[]) => insertProductReview(...a),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('sonner', () => ({
  toast: {
    error: (...a: unknown[]) => toastError(...a),
    success: (...a: unknown[]) => toastSuccess(...a),
  },
}));

import { useReviews } from './useReviews';

const makeReview = (overrides: Partial<{ id: string; rating: number }>) => ({
  id: overrides.id ?? `r-${Math.random()}`,
  product_id: 1,
  user_id: 'u',
  rating: overrides.rating ?? 5,
  helpful_count: 0,
  is_verified_purchase: false,
  is_approved: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
});

describe('useReviews', () => {
  beforeEach(() => {
    fetchApprovedReviewsForProduct.mockReset();
    fetchReviewHelpfulCount.mockReset();
    fetchUserReviewForProduct.mockReset();
    incrementReviewHelpfulCount.mockReset();
    insertProductReview.mockReset();
    useAuthMock.mockReset();
    toastError.mockReset();
    toastSuccess.mockReset();
  });

  it('loads reviews and computes stats on mount', async () => {
    useAuthMock.mockReturnValue({ user: { id: 'u' } });
    fetchApprovedReviewsForProduct.mockResolvedValue([
      makeReview({ id: 'a', rating: 5 }),
      makeReview({ id: 'b', rating: 3 }),
    ]);

    const { result } = renderHook(() => useReviews(1));
    await waitFor(() => expect(result.current.reviews).toHaveLength(2));
    expect(result.current.stats.totalReviews).toBe(2);
    expect(result.current.stats.averageRating).toBeCloseTo(4);
    expect(result.current.stats.ratingDistribution[5]).toBe(1);
    expect(result.current.stats.ratingDistribution[3]).toBe(1);
  });

  it('does nothing when called with no productId', () => {
    useAuthMock.mockReturnValue({ user: null });
    renderHook(() => useReviews(undefined));
    expect(fetchApprovedReviewsForProduct).not.toHaveBeenCalled();
  });

  it('submitReview requires a logged-in user', async () => {
    useAuthMock.mockReturnValue({ user: null });
    fetchApprovedReviewsForProduct.mockResolvedValue([]);

    const { result } = renderHook(() => useReviews(1));
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.submitReview({ product_id: 1, rating: 5 });
    });
    expect(ok).toBe(false);
    expect(toastError).toHaveBeenCalled();
    expect(insertProductReview).not.toHaveBeenCalled();
  });

  it('submitReview persists the review under the current user', async () => {
    useAuthMock.mockReturnValue({ user: { id: 'u' } });
    fetchApprovedReviewsForProduct.mockResolvedValue([]);
    insertProductReview.mockResolvedValue(undefined);

    const { result } = renderHook(() => useReviews(1));
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.submitReview({ product_id: 1, rating: 4 });
    });
    expect(ok).toBe(true);
    expect(insertProductReview).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'u',
        product_id: 1,
        rating: 4,
        is_approved: false,
      })
    );
    expect(toastSuccess).toHaveBeenCalled();
  });

  it('markHelpful increments the helpful count locally and via service', async () => {
    useAuthMock.mockReturnValue({ user: { id: 'u' } });
    fetchApprovedReviewsForProduct.mockResolvedValue([
      makeReview({ id: 'rev-1', rating: 5 }),
    ]);
    fetchReviewHelpfulCount.mockResolvedValue({ helpful_count: 3 });
    incrementReviewHelpfulCount.mockResolvedValue(undefined);

    const { result } = renderHook(() => useReviews(1));
    await waitFor(() => expect(result.current.reviews).toHaveLength(1));

    await act(async () => {
      await result.current.markHelpful('rev-1');
    });

    expect(incrementReviewHelpfulCount).toHaveBeenCalledWith('rev-1', 4);
    expect(result.current.reviews[0].helpful_count).toBe(1);
  });

  it('getUserReview returns null when there is no user', async () => {
    useAuthMock.mockReturnValue({ user: null });
    fetchApprovedReviewsForProduct.mockResolvedValue([]);

    const { result } = renderHook(() => useReviews(1));
    const out = await result.current.getUserReview(1);
    expect(out).toBeNull();
    expect(fetchUserReviewForProduct).not.toHaveBeenCalled();
  });
});
