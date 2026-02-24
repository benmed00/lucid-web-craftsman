/**
 * Stable Callback Hook
 * Prevents unnecessary re-renders by providing stable function references
 */

import { useCallback, useRef, useEffect } from 'react';

/**
 * Returns a stable callback that always calls the latest version of the function
 * without causing re-renders when the function changes
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T
): T {
  const callbackRef = useRef<T>(callback);

  // Update the ref whenever the callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Return a stable function that calls the current callback
  return useCallback(
    ((...args: Parameters<T>) => callbackRef.current(...args)) as T,
    []
  );
}

/**
 * Returns a stable value that only updates when the value actually changes
 * Useful for objects/arrays that are recreated on each render
 */
export function useStableValue<T>(
  value: T,
  isEqual?: (a: T, b: T) => boolean
): T {
  const ref = useRef<T>(value);

  const areEqual = isEqual
    ? isEqual(ref.current, value)
    : JSON.stringify(ref.current) === JSON.stringify(value);

  if (!areEqual) {
    ref.current = value;
  }

  return ref.current;
}

/**
 * Creates a debounced version of a callback
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    }) as T,
    [delay]
  );
}

/**
 * Creates a throttled version of a callback
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRunRef = useRef<number>(0);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastRunRef.current >= delay) {
        lastRunRef.current = now;
        callbackRef.current(...args);
      }
    }) as T,
    [delay]
  );
}
