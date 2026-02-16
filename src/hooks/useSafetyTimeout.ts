/**
 * Safety Timeout Hook
 * Prevents infinite loading states by forcing a fallback after a configurable delay.
 * Usage:
 *   const { hasTimedOut } = useSafetyTimeout(isLoading, 5000);
 *   if (hasTimedOut) show error state instead of skeleton
 */

import { useState, useEffect, useRef } from 'react';

interface SafetyTimeoutOptions {
  /** Timeout in ms (default: 5000) */
  timeout?: number;
  /** Callback when timeout fires */
  onTimeout?: () => void;
}

export function useSafetyTimeout(
  isLoading: boolean,
  options: SafetyTimeoutOptions | number = 5000
): { hasTimedOut: boolean } {
  const opts = typeof options === 'number' ? { timeout: options } : options;
  const { timeout = 5000, onTimeout } = opts;

  const [hasTimedOut, setHasTimedOut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isLoading) {
      setHasTimedOut(false);
      timerRef.current = setTimeout(() => {
        setHasTimedOut(true);
        onTimeout?.();
      }, timeout);
    } else {
      setHasTimedOut(false);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isLoading, timeout, onTimeout]);

  return { hasTimedOut };
}
