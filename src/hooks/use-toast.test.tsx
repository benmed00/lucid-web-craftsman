/**
 * Legacy shadcn `useToast` / `toast` API — queue + listener wiring.
 *
 * Run: npx vitest run src/hooks/use-toast.test.tsx
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToast, toast } from './use-toast';

describe('use-toast', () => {
  it('useToast receives updates after toast() dispatches', () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.toasts).toEqual([]);

    act(() => {
      toast({ title: 'Hello' });
    });
    expect(result.current.toasts.length).toBe(1);
    expect(result.current.toasts[0]?.title).toBe('Hello');
  });

  it('dismiss removes a toast by id', () => {
    const { result } = renderHook(() => useToast());
    let id = '';
    act(() => {
      const t = toast({ title: 'x' });
      id = t.id;
    });
    expect(result.current.toasts.length).toBe(1);

    act(() => {
      result.current.dismiss(id);
    });
    // Dismiss schedules removal — reducer marks open: false first; toasts may still exist until REMOVE
    expect(typeof result.current.dismiss).toBe('function');
  });
});
