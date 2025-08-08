import { useState, useEffect } from 'react';

interface CsrfToken {
  token: string;
  timestamp: number;
}

export const useCsrfToken = () => {
  const [csrfToken, setCsrfToken] = useState<string>('');

  useEffect(() => {
    const generateToken = () => {
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    };

    const getStoredToken = (): CsrfToken | null => {
      try {
        const stored = sessionStorage.getItem('csrf_token');
        if (!stored) return null;
        
        const parsed: CsrfToken = JSON.parse(stored);
        const now = Date.now();
        
        // Token expires after 1 hour
        if (now - parsed.timestamp > 60 * 60 * 1000) {
          sessionStorage.removeItem('csrf_token');
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
    } else {
      const newToken = generateToken();
      const tokenData: CsrfToken = {
        token: newToken,
        timestamp: Date.now()
      };
      sessionStorage.setItem('csrf_token', JSON.stringify(tokenData));
      setCsrfToken(newToken);
    }
  }, []);

  return csrfToken;
};