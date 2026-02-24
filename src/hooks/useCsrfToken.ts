import { useState, useEffect, useCallback } from 'react';

interface CsrfToken {
  token: string;
  timestamp: number;
  nonce: string;
}

// Generate a cryptographically secure token
const generateSecureToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join(
    ''
  );
};

// Generate a nonce for additional entropy
const generateNonce = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
};

// Hash token with nonce for server verification
const hashToken = async (token: string, nonce: string): Promise<string> => {
  const data = new TextEncoder().encode(`${token}:${nonce}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};

export const useCsrfToken = () => {
  const [csrfToken, setCsrfToken] = useState<string>('');
  const [csrfNonce, setCsrfNonce] = useState<string>('');

  useEffect(() => {
    const getStoredToken = (): CsrfToken | null => {
      try {
        const stored = sessionStorage.getItem('csrf_token_v2');
        if (!stored) return null;

        const parsed: CsrfToken = JSON.parse(stored);
        const now = Date.now();

        // Token expires after 30 minutes for security
        if (now - parsed.timestamp > 30 * 60 * 1000) {
          sessionStorage.removeItem('csrf_token_v2');
          return null;
        }

        return parsed;
      } catch {
        return null;
      }
    };

    const stored = getStoredToken();
    if (stored) {
      setCsrfToken(stored.token);
      setCsrfNonce(stored.nonce);
    } else {
      const newToken = generateSecureToken();
      const newNonce = generateNonce();
      const tokenData: CsrfToken = {
        token: newToken,
        nonce: newNonce,
        timestamp: Date.now(),
      };
      sessionStorage.setItem('csrf_token_v2', JSON.stringify(tokenData));
      setCsrfToken(newToken);
      setCsrfNonce(newNonce);
    }
  }, []);

  // Generate a verification hash for server-side validation
  const getVerificationHash = useCallback(async (): Promise<string> => {
    if (!csrfToken || !csrfNonce) return '';
    return await hashToken(csrfToken, csrfNonce);
  }, [csrfToken, csrfNonce]);

  // Regenerate token (use after successful sensitive operations)
  const regenerateToken = useCallback(() => {
    const newToken = generateSecureToken();
    const newNonce = generateNonce();
    const tokenData: CsrfToken = {
      token: newToken,
      nonce: newNonce,
      timestamp: Date.now(),
    };
    sessionStorage.setItem('csrf_token_v2', JSON.stringify(tokenData));
    setCsrfToken(newToken);
    setCsrfNonce(newNonce);
  }, []);

  // Get headers for API requests
  const getCsrfHeaders = useCallback(async (): Promise<
    Record<string, string>
  > => {
    const hash = await getVerificationHash();
    return {
      'X-CSRF-Token': csrfToken,
      'X-CSRF-Nonce': csrfNonce,
      'X-CSRF-Hash': hash,
    };
  }, [csrfToken, csrfNonce, getVerificationHash]);

  return {
    csrfToken,
    csrfNonce,
    getVerificationHash,
    regenerateToken,
    getCsrfHeaders,
  };
};
