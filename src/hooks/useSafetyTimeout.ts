/**
 * Safety Timeout Hook
 * Prevents infinite loading states by forcing a fallback after a configurable delay.
 * Supports progressive disclosure with intermediate "slow loading" state.
 *
 * CRITICAL FIX: Callbacks are stored in refs so they don't reset the timer
 * on every render (unstable arrow-function references were the root cause
 * of the timeout never firing).
 */

import { useState, useEffect, useRef } from 'react';

interface SafetyTimeoutOptions {
  /** Timeout in ms (default: 12000) */
  timeout?: number;
  /** Threshold for "slow loading" indicator in ms (default: 5000) */
  slowThreshold?: number;
  /** Callback when timeout fires */
  onTimeout?: () => void;
  /** Callback when slow threshold is reached */
  onSlowLoading?: () => void;
}

export interface SafetyTimeoutReturn {
  hasTimedOut: boolean;
  isSlowLoading: boolean;
}

export function useSafetyTimeout(
  isLoading: boolean,
  options: SafetyTimeoutOptions | number = 12000
): SafetyTimeoutReturn {
  const opts = typeof options === 'number' ? { timeout: options } : options;
  const {
    timeout = 12000,
    slowThreshold = 5000,
    onTimeout,
    onSlowLoading,
  } = opts;

  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [isSlowLoading, setIsSlowLoading] = useState(false);

  // Store callbacks in refs to avoid resetting timers on every render
  const onTimeoutRef = useRef(onTimeout);
  const onSlowLoadingRef = useRef(onSlowLoading);
  onTimeoutRef.current = onTimeout;
  onSlowLoadingRef.current = onSlowLoading;

  useEffect(() => {
    if (isLoading) {
      setHasTimedOut(false);
      setIsSlowLoading(false);

      const slowTimer = setTimeout(() => {
        setIsSlowLoading(true);
        onSlowLoadingRef.current?.();
      }, slowThreshold);

      const mainTimer = setTimeout(() => {
        console.warn(
          `[SafetyTimeout] Loading exceeded ${timeout}ms — forcing render`
        );
        setHasTimedOut(true);
        onTimeoutRef.current?.();
      }, timeout);

      return () => {
        clearTimeout(slowTimer);
        clearTimeout(mainTimer);
      };
    } else {
      setHasTimedOut(false);
      setIsSlowLoading(false);
    }
    // Only depend on primitive values — callbacks are in refs
  }, [isLoading, timeout, slowThreshold]);

  return { hasTimedOut, isSlowLoading };
}
