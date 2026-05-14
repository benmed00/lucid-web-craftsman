/**
 * Tests for usePullToRefresh.
 *
 * Prerequisites: a small wrapper component attaches the ref through JSX
 * so the listener-binding effect actually sees a DOM element.
 * Run: npx vitest run src/hooks/usePullToRefresh.test.tsx
 */

import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import React, { useImperativeHandle, forwardRef } from 'react';
import { usePullToRefresh } from './usePullToRefresh';

type Handle = ReturnType<typeof usePullToRefresh>;

interface Props {
  onRefresh: () => Promise<void>;
  disabled?: boolean;
}

const Harness = forwardRef<Handle, Props>(function Harness(
  { onRefresh, disabled = false },
  ref
) {
  const api = usePullToRefresh({ onRefresh, threshold: 80, disabled });
  useImperativeHandle(ref, () => api, [api]);
  return <div data-testid="container" ref={api.containerRef} />;
});

function buildTouchEvent(
  type: 'touchstart' | 'touchmove' | 'touchend',
  clientY: number
): Event {
  const evt = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(evt, 'touches', {
    value: [{ clientY }] as unknown as TouchList,
  });
  return evt;
}

describe('usePullToRefresh', () => {
  it('returns initial idle state', () => {
    const ref = React.createRef<Handle>();
    render(<Harness ref={ref} onRefresh={vi.fn()} />);
    expect(ref.current!.isRefreshing).toBe(false);
    expect(ref.current!.pullDistance).toBe(0);
    expect(ref.current!.shouldTrigger).toBe(false);
  });

  it('triggers onRefresh when pulled past the threshold', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const ref = React.createRef<Handle>();
    const { getByTestId } = render(
      <Harness ref={ref} onRefresh={onRefresh} />
    );
    const container = getByTestId('container');

    // Separate act() blocks so React commits setCanPull(true) before touchmove
    // fires and re-runs the listener-binding effect with the fresh closure.
    act(() => {
      container.dispatchEvent(buildTouchEvent('touchstart', 100));
    });
    act(() => {
      container.dispatchEvent(buildTouchEvent('touchmove', 400));
    });
    expect(ref.current!.isPulling).toBe(true);
    expect(ref.current!.shouldTrigger).toBe(true);

    await act(async () => {
      container.dispatchEvent(buildTouchEvent('touchend', 400));
      await Promise.resolve();
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(ref.current!.isRefreshing).toBe(false);
    expect(ref.current!.pullDistance).toBe(0);
  });

  it('does not trigger onRefresh when disabled', async () => {
    const onRefresh = vi.fn();
    const ref = React.createRef<Handle>();
    const { getByTestId } = render(
      <Harness ref={ref} onRefresh={onRefresh} disabled />
    );
    const container = getByTestId('container');

    act(() => {
      container.dispatchEvent(buildTouchEvent('touchstart', 100));
    });
    act(() => {
      container.dispatchEvent(buildTouchEvent('touchmove', 400));
    });
    await act(async () => {
      container.dispatchEvent(buildTouchEvent('touchend', 400));
      await Promise.resolve();
    });

    expect(onRefresh).not.toHaveBeenCalled();
    expect(ref.current!.isRefreshing).toBe(false);
  });
});
