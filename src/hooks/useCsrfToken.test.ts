/**
 * Tests for useCsrfToken (sessionStorage + Web Crypto).
 *
 * Prerequisites: Node 20+ for crypto.subtle / crypto.getRandomValues (built-in).
 * Run: npx vitest run src/hooks/useCsrfToken.test.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCsrfToken } from './useCsrfToken';

const STORAGE_KEY = 'csrf_token_v2';

describe('useCsrfToken', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });
  afterEach(() => {
    sessionStorage.clear();
  });

  it('generates and persists a fresh token + nonce on first mount', async () => {
    const { result } = renderHook(() => useCsrfToken());

    await waitFor(() => expect(result.current.csrfToken).not.toBe(''));
    expect(result.current.csrfNonce).not.toBe('');

    const raw = sessionStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!) as {
      token: string;
      nonce: string;
      timestamp: number;
    };
    expect(parsed.token).toBe(result.current.csrfToken);
    expect(parsed.nonce).toBe(result.current.csrfNonce);
  });

  it('reuses a stored token when it is still fresh', async () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        token: 'stored-token',
        nonce: 'stored-nonce',
        timestamp: Date.now(),
      })
    );

    const { result } = renderHook(() => useCsrfToken());
    await waitFor(() => expect(result.current.csrfToken).toBe('stored-token'));
    expect(result.current.csrfNonce).toBe('stored-nonce');
  });

  it('discards a stored token older than 30 minutes', async () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        token: 'old-token',
        nonce: 'old-nonce',
        timestamp: Date.now() - 31 * 60 * 1000,
      })
    );

    const { result } = renderHook(() => useCsrfToken());
    await waitFor(() => expect(result.current.csrfToken).not.toBe(''));
    expect(result.current.csrfToken).not.toBe('old-token');
  });

  it('regenerateToken issues a new token and persists it', async () => {
    const { result } = renderHook(() => useCsrfToken());
    await waitFor(() => expect(result.current.csrfToken).not.toBe(''));

    const initial = result.current.csrfToken;
    act(() => result.current.regenerateToken());

    expect(result.current.csrfToken).not.toBe(initial);
    expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY)!).token).toBe(
      result.current.csrfToken
    );
  });

  it('getCsrfHeaders returns token, nonce, and SHA-256 hash headers', async () => {
    const { result } = renderHook(() => useCsrfToken());
    await waitFor(() => expect(result.current.csrfToken).not.toBe(''));

    let headers: Record<string, string> | null = null;
    await act(async () => {
      headers = await result.current.getCsrfHeaders();
    });

    expect(headers).not.toBeNull();
    expect(headers!['X-CSRF-Token']).toBe(result.current.csrfToken);
    expect(headers!['X-CSRF-Nonce']).toBe(result.current.csrfNonce);
    expect(headers!['X-CSRF-Hash']).toMatch(/^[0-9a-f]{64}$/);
  });

  it('falls back gracefully when stored token JSON is corrupted', async () => {
    sessionStorage.setItem(STORAGE_KEY, '{not-json');

    const { result } = renderHook(() => useCsrfToken());
    await waitFor(() => expect(result.current.csrfToken).not.toBe(''));
    expect(result.current.csrfToken).toHaveLength(64);
  });
});
