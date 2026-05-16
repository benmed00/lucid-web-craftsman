/**
 * Thin React facades around scheduling utilities.
 *
 * Run: npx vitest run src/utils/reactSchedulingHooks.test.ts
 */

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTaskScheduler } from './taskScheduler';
import { useMainThreadOptimizer } from './mainThreadOptimizer';
import { useInputResponsiveness } from './inputResponsivenessOptimizer';

describe('scheduling hook facades', () => {
  it('useTaskScheduler exposes schedule helpers', () => {
    const { result } = renderHook(() => useTaskScheduler());
    expect(typeof result.current.schedule).toBe('function');
    expect(typeof result.current.scheduleBatch).toBe('function');
    expect(typeof result.current.scheduleChunked).toBe('function');
  });

  it('useMainThreadOptimizer exposes worker helpers', () => {
    const { result } = renderHook(() => useMainThreadOptimizer());
    expect(typeof result.current.executeInWorker).toBe('function');
    expect(typeof result.current.executeBatch).toBe('function');
  });

  it('useInputResponsiveness exposes chunking helpers', () => {
    const { result } = renderHook(() => useInputResponsiveness());
    expect(typeof result.current.processArrayInChunks).toBe('function');
    expect(typeof result.current.executeWithYielding).toBe('function');
  });
});
