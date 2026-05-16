/**
 * Tests for useIsMobile (matchMedia-backed breakpoint).
 *
 * Prerequisites: jsdom + the matchMedia stub from src/tests/setupTests.ts;
 * tests override `window.matchMedia` and `window.innerWidth` per case.
 * Run: npx vitest run src/hooks/use-mobile.test.tsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIsMobile } from './use-mobile';

type Listener = (ev: MediaQueryListEvent) => void;

interface FakeMql extends MediaQueryList {
  __triggerChange: (matches: boolean) => void;
}

function stubMatchMedia(initialMatches: boolean): FakeMql {
  const listeners: Listener[] = [];
  let matches = initialMatches;
  const mql: FakeMql = {
    get matches() {
      return matches;
    },
    set matches(v: boolean) {
      matches = v;
    },
    media: '(max-width: 767px)',
    onchange: null,
    addEventListener: (_evt: string, cb: Listener) => listeners.push(cb),
    removeEventListener: (_evt: string, cb: Listener) => {
      const i = listeners.indexOf(cb);
      if (i >= 0) listeners.splice(i, 1);
    },
    addListener: (cb: Listener) => listeners.push(cb),
    removeListener: (cb: Listener) => {
      const i = listeners.indexOf(cb);
      if (i >= 0) listeners.splice(i, 1);
    },
    dispatchEvent: () => true,
    __triggerChange(next: boolean) {
      matches = next;
      listeners.forEach((cb) =>
        cb({ matches: next } as unknown as MediaQueryListEvent)
      );
    },
  } as unknown as FakeMql;

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockReturnValue(mql),
  });

  return mql;
}

function setInnerWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
}

describe('useIsMobile', () => {
  beforeEach(() => {
    setInnerWidth(1024);
  });

  it('returns false for desktop widths', () => {
    setInnerWidth(1024);
    stubMatchMedia(false);

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('returns true for narrow widths', () => {
    setInnerWidth(500);
    stubMatchMedia(true);

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('reacts to matchMedia change events', () => {
    setInnerWidth(1024);
    const mql = stubMatchMedia(false);

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    act(() => {
      setInnerWidth(500);
      mql.__triggerChange(true);
    });

    expect(result.current).toBe(true);
  });
});
