/**
 * Tests for the order-management hook family (admin + customer views).
 *
 * Prerequisites: mocked `@/services/adminOrdersApi` + `@/services/profileApi`,
 * sonner toast. Each test wraps the hook in a fresh QueryClientProvider so
 * cache state does not leak between cases.
 * Run: npx vitest run src/hooks/useOrderManagement.test.tsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const {
  fetchAdminOrderById,
  fetchAdminOrdersFiltered,
  fetchCustomerOrdersSummaryList,
  fetchOrderAnomaliesRows,
  fetchOrderStatsProjectionRows,
  fetchOrderStatusHistoryRows,
  fetchValidTransitionsFromStatus,
  rpcGetOrderCustomerView,
  rpcResolveOrderAnomaly,
  rpcUpdateOrderStatus,
  subscribeOrdersTableUpdates,
  fetchAuthUserOrNull,
  toastError,
  toastSuccess,
  toastInfo,
} = vi.hoisted(() => ({
  fetchAdminOrderById: vi.fn(),
  fetchAdminOrdersFiltered: vi.fn(),
  fetchCustomerOrdersSummaryList: vi.fn(),
  fetchOrderAnomaliesRows: vi.fn(),
  fetchOrderStatsProjectionRows: vi.fn(),
  fetchOrderStatusHistoryRows: vi.fn(),
  fetchValidTransitionsFromStatus: vi.fn(),
  rpcGetOrderCustomerView: vi.fn(),
  rpcResolveOrderAnomaly: vi.fn(),
  rpcUpdateOrderStatus: vi.fn(),
  subscribeOrdersTableUpdates: vi.fn(),
  fetchAuthUserOrNull: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  toastInfo: vi.fn(),
}));

vi.mock('@/services/adminOrdersApi', () => ({
  fetchAdminOrderById: (...a: unknown[]) => fetchAdminOrderById(...a),
  fetchAdminOrdersFiltered: (...a: unknown[]) => fetchAdminOrdersFiltered(...a),
  fetchCustomerOrdersSummaryList: (...a: unknown[]) =>
    fetchCustomerOrdersSummaryList(...a),
  fetchOrderAnomaliesRows: (...a: unknown[]) => fetchOrderAnomaliesRows(...a),
  fetchOrderStatsProjectionRows: (...a: unknown[]) =>
    fetchOrderStatsProjectionRows(...a),
  fetchOrderStatusHistoryRows: (...a: unknown[]) =>
    fetchOrderStatusHistoryRows(...a),
  fetchValidTransitionsFromStatus: (...a: unknown[]) =>
    fetchValidTransitionsFromStatus(...a),
  rpcGetOrderCustomerView: (...a: unknown[]) => rpcGetOrderCustomerView(...a),
  rpcResolveOrderAnomaly: (...a: unknown[]) => rpcResolveOrderAnomaly(...a),
  rpcUpdateOrderStatus: (...a: unknown[]) => rpcUpdateOrderStatus(...a),
  subscribeOrdersTableUpdates: (...a: unknown[]) =>
    subscribeOrdersTableUpdates(...a),
}));

vi.mock('@/services/profileApi', () => ({
  fetchAuthUserOrNull: (...a: unknown[]) => fetchAuthUserOrNull(...a),
}));

vi.mock('sonner', () => ({
  toast: {
    error: (...a: unknown[]) => toastError(...a),
    success: (...a: unknown[]) => toastSuccess(...a),
    info: (...a: unknown[]) => toastInfo(...a),
  },
}));

import {
  useOrders,
  useOrder,
  useOrderHistory,
  useOrderAnomalies,
  useValidTransitions,
  useOrderStats,
  useUpdateOrderStatus,
  useResolveAnomaly,
  useCustomerOrder,
  useCustomerOrders,
  useOrderRealtimeUpdates,
} from './useOrderManagement';

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useOrders', () => {
  it('queries admin orders with filters', async () => {
    fetchAdminOrdersFiltered.mockResolvedValue([{ id: 'o1' }]);

    const { result } = renderHook(() => useOrders({ status: ['paid'] }), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: 'o1' }]);
    expect(fetchAdminOrdersFiltered).toHaveBeenCalledWith({
      status: ['paid'],
    });
  });
});

describe('useOrder', () => {
  it('skips fetching when orderId is null', () => {
    const { result } = renderHook(() => useOrder(null), {
      wrapper: makeWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchAdminOrderById).not.toHaveBeenCalled();
  });

  it('fetches a single order by id', async () => {
    fetchAdminOrderById.mockResolvedValue({ id: 'o1' });
    const { result } = renderHook(() => useOrder('o1'), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ id: 'o1' });
  });
});

describe('useOrderHistory + useOrderAnomalies + useValidTransitions', () => {
  it('returns [] without service call when orderId is missing', async () => {
    const { result } = renderHook(() => useOrderHistory(null), {
      wrapper: makeWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');

    const { result: anomalies } = renderHook(
      () => useOrderAnomalies(undefined),
      { wrapper: makeWrapper() }
    );
    expect(anomalies.current.fetchStatus).toBe('idle');

    const { result: transitions } = renderHook(
      () => useValidTransitions(null),
      { wrapper: makeWrapper() }
    );
    expect(transitions.current.fetchStatus).toBe('idle');
  });

  it('forwards orderId + unresolvedOnly to fetchOrderAnomaliesRows', async () => {
    fetchOrderAnomaliesRows.mockResolvedValue([{ id: 'a1' }]);
    const { result } = renderHook(() => useOrderAnomalies('o1', true), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchOrderAnomaliesRows).toHaveBeenCalledWith('o1', true);
  });
});

describe('useOrderStats', () => {
  it('aggregates the projection rows into KPI buckets', async () => {
    fetchOrderStatsProjectionRows.mockResolvedValue([
      {
        order_status: 'created',
        has_anomaly: false,
        requires_attention: false,
      },
      { order_status: 'paid', has_anomaly: false, requires_attention: false },
      { order_status: 'shipped', has_anomaly: true, requires_attention: false },
      {
        order_status: 'delivered',
        has_anomaly: false,
        requires_attention: true,
      },
    ]);

    const { result } = renderHook(() => useOrderStats(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      total: 4,
      pending_payment: 1,
      processing: 1,
      shipped: 1,
      delivered: 1,
      anomalies: 1,
      requires_attention: 1,
    });
  });
});

describe('useUpdateOrderStatus', () => {
  it('calls the RPC, surfaces success, and toasts the transition', async () => {
    fetchAuthUserOrNull.mockResolvedValue({ id: 'admin-1' });
    rpcUpdateOrderStatus.mockResolvedValue({
      data: { success: true, old_status: 'paid', new_status: 'shipped' },
      error: null,
    });

    const { result } = renderHook(() => useUpdateOrderStatus(), {
      wrapper: makeWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        orderId: 'o1',
        newStatus: 'shipped',
      });
    });
    expect(rpcUpdateOrderStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'o1',
        newStatus: 'shipped',
        actorUserId: 'admin-1',
      })
    );
    expect(toastSuccess).toHaveBeenCalled();
  });

  it('throws and toasts when the RPC reports failure', async () => {
    fetchAuthUserOrNull.mockResolvedValue(null);
    rpcUpdateOrderStatus.mockResolvedValue({
      data: { success: false, message: 'forbidden' },
      error: null,
    });

    const { result } = renderHook(() => useUpdateOrderStatus(), {
      wrapper: makeWrapper(),
    });

    await expect(
      result.current.mutateAsync({ orderId: 'o1', newStatus: 'shipped' })
    ).rejects.toThrow('forbidden');
    expect(toastError).toHaveBeenCalled();
  });
});

describe('useResolveAnomaly', () => {
  it('passes the resolution payload to the RPC under the actor id', async () => {
    fetchAuthUserOrNull.mockResolvedValue({ id: 'admin-1' });
    rpcResolveOrderAnomaly.mockResolvedValue({
      data: { success: true },
      error: null,
    });

    const { result } = renderHook(() => useResolveAnomaly(), {
      wrapper: makeWrapper(),
    });
    await act(async () => {
      await result.current.mutateAsync({
        anomalyId: 'a1',
        resolutionNotes: 'ok',
      });
    });
    expect(rpcResolveOrderAnomaly).toHaveBeenCalledWith(
      expect.objectContaining({
        anomalyId: 'a1',
        resolvedBy: 'admin-1',
        resolutionNotes: 'ok',
      })
    );
    expect(toastSuccess).toHaveBeenCalled();
  });

  it('rejects when there is no authenticated admin', async () => {
    fetchAuthUserOrNull.mockResolvedValue(null);

    const { result } = renderHook(() => useResolveAnomaly(), {
      wrapper: makeWrapper(),
    });
    await expect(
      result.current.mutateAsync({
        anomalyId: 'a1',
        resolutionNotes: 'ok',
      })
    ).rejects.toThrow(/Connexion requise/);
    expect(rpcResolveOrderAnomaly).not.toHaveBeenCalled();
  });
});

describe('useCustomerOrder + useCustomerOrders', () => {
  it('useCustomerOrder calls rpcGetOrderCustomerView with locale + userId', async () => {
    fetchAuthUserOrNull.mockResolvedValue({ id: 'user-1' });
    rpcGetOrderCustomerView.mockResolvedValue({
      data: { id: 'o1' },
      error: null,
    });

    const { result } = renderHook(() => useCustomerOrder('o1', 'en'), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(rpcGetOrderCustomerView).toHaveBeenCalledWith({
      orderId: 'o1',
      userId: 'user-1',
      locale: 'en',
    });
  });

  it('useCustomerOrders fetches the customer-facing summary list', async () => {
    fetchAuthUserOrNull.mockResolvedValue({ id: 'user-1' });
    fetchCustomerOrdersSummaryList.mockResolvedValue([{ id: 'o1' }]);
    const { result } = renderHook(() => useCustomerOrders(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchCustomerOrdersSummaryList).toHaveBeenCalledWith('user-1');
    expect(result.current.data).toEqual([{ id: 'o1' }]);
  });
});

describe('useOrderRealtimeUpdates', () => {
  it('subscribe() registers the orders realtime listener', () => {
    const unsub = vi.fn();
    subscribeOrdersTableUpdates.mockReturnValue(unsub);

    const { result } = renderHook(() => useOrderRealtimeUpdates('order-uuid'), {
      wrapper: makeWrapper(),
    });

    let cleanup: (() => void) | undefined;
    act(() => {
      cleanup = result.current.subscribe();
    });

    expect(subscribeOrdersTableUpdates).toHaveBeenCalledWith(
      'order-uuid',
      expect.any(Function)
    );
    expect(typeof cleanup).toBe('function');
    cleanup?.();
    expect(unsub).toHaveBeenCalled();
  });

  it('invalidates queries when payload reports a status change', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });
    let handler: ((p: unknown) => void) | undefined;
    subscribeOrdersTableUpdates.mockImplementation((_id, onEvent) => {
      handler = onEvent as (p: unknown) => void;
      return vi.fn();
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useOrderRealtimeUpdates('oid'), {
      wrapper,
    });
    act(() => {
      result.current.subscribe();
    });

    await act(async () => {
      handler?.({
        old: { id: 'oid', order_status: 'paid' },
        new: { id: 'oid', order_status: 'shipped' },
      });
    });

    expect(invalidateSpy).toHaveBeenCalled();
    expect(toastInfo).toHaveBeenCalled();
  });
});
