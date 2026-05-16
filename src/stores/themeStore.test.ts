/**
 * Tests for themeStore (light / dark / system).
 *
 * Prerequisites: jsdom matchMedia stub from src/tests/setupTests.ts.
 * Run: npx vitest run src/stores/themeStore.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useThemeStore, useTheme } from './themeStore';
import { renderHook, act } from '@testing-library/react';

describe('useThemeStore', () => {
  beforeEach(() => {
    useThemeStore.setState({ theme: 'system' });
    document.documentElement.classList.remove('dark');
  });

  it('setTheme(dark) sets resolvedTheme and adds the html.dark class', () => {
    act(() => useThemeStore.getState().setTheme('dark'));
    expect(useThemeStore.getState().theme).toBe('dark');
    expect(useThemeStore.getState().resolvedTheme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('setTheme(light) removes the html.dark class', () => {
    act(() => useThemeStore.getState().setTheme('dark'));
    act(() => useThemeStore.getState().setTheme('light'));
    expect(useThemeStore.getState().resolvedTheme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('toggleTheme flips between light and dark', () => {
    act(() => useThemeStore.getState().setTheme('light'));
    act(() => useThemeStore.getState().toggleTheme());
    expect(useThemeStore.getState().resolvedTheme).toBe('dark');
    act(() => useThemeStore.getState().toggleTheme());
    expect(useThemeStore.getState().resolvedTheme).toBe('light');
  });
});

describe('useTheme', () => {
  it('exposes the same setters as the underlying store', () => {
    const { result } = renderHook(() => useTheme());
    expect(typeof result.current.setTheme).toBe('function');
    expect(typeof result.current.toggleTheme).toBe('function');

    act(() => result.current.setTheme('dark'));
    expect(result.current.resolvedTheme).toBe('dark');
  });
});
