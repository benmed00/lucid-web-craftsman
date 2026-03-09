/**
 * Safety Timeout Hook
 * Prevents infinite loading states by forcing a fallback after a configurable delay.
 * Now supports progressive disclosure with intermediate "slow loading" state.
 * 
 * Usage:
 *   const { hasTimedOut, isSlowLoading } = useSafetyTimeout(isLoading, {
 *     timeout: 12000,
 *     slowThreshold: 5000,
 *   });
 *   if (isSlowLoading) show "Still loading..." message
 *   if (hasTimedOut) show error state instead of skeleton
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

interface SafetyTimeoutReturn {
  hasTimedOut: boolean;
  isSlowLoading: boolean;
}

export function useSafetyTimeout(
  isLoading: boolean,
  options: SafetyTimeoutOptions | number = 12000
): SafetyTimeoutReturn {
  const opts = typeof options === 'number' ? { timeout: options } : options;
  const { timeout = 12000, slowThreshold = 5000, onTimeout, onSlowLoading } = opts;

  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [isSlowLoading, setIsSlowLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isLoading) {
      setHasTimedOut(false);
      setIsSlowLoading(false);

      // Set slow loading indicator after slowThreshold
      slowTimerRef.current = setTimeout(() => {
        setIsSlowLoading(true);
        onSlowLoading?.();
      }, slowThreshold);

      // Set final timeout
      timerRef.current = setTimeout(() => {
        setHasTimedOut(true);
        onTimeout?.();
      }, timeout);
    } else {
      setHasTimedOut(false);
      setIsSlowLoading(false);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (slowTimerRef.current) {
        clearTimeout(slowTimerRef.current);
        slowTimerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (slowTimerRef.current) {
        clearTimeout(slowTimerRef.current);
      }
    };
  }, [isLoading, timeout, slowThreshold, onTimeout, onSlowLoading]);

  return { hasTimedOut, isSlowLoading };
}

