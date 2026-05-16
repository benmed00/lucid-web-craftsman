/**
 * useOptimizedComputation — defers work through taskScheduler.
 *
 * Prerequisites: synchronous `taskScheduler.schedule` for determinism.
 * Run: npx vitest run src/components/performance/PerformanceMonitor.hooks.test.tsx
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { taskScheduler } from '@/utils/taskScheduler';
import { useOptimizedComputation } from './PerformanceMonitor';

describe('useOptimizedComputation', () => {
  beforeEach(() => {
    vi.spyOn(taskScheduler, 'schedule').mockImplementation((fn: () => void) => {
      fn();
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('computes the value asynchronously via the scheduler', async () => {
    const { result } = renderHook(() =>
      useOptimizedComputation(() => 2 + 2, [], 0)
    );
    await waitFor(() => expect(result.current).toBe(4));
  });
});
