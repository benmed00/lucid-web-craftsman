/**
 * Global Supabase Error Handler
 * Intercepts Supabase query errors and shows user-facing toasts.
 * Import and call once at app init.
 */

import { toast } from 'sonner';

type SupabaseErrorCode = string;

interface ErrorConfig {
  message: string;
  description?: string;
  severity: 'error' | 'warning' | 'info';
}

const ERROR_MAP: Record<SupabaseErrorCode, ErrorConfig> = {
  '42501': {
    message: 'Accès refusé',
    description: "Vous n'avez pas les permissions nécessaires.",
    severity: 'error',
  },
  '23505': {
    message: 'Doublon détecté',
    description: 'Cet élément existe déjà.',
    severity: 'warning',
  },
  '23503': {
    message: 'Référence invalide',
    description: 'Un élément lié est introuvable.',
    severity: 'error',
  },
  '42P01': {
    message: 'Erreur technique',
    description: 'Une table est introuvable. Contactez le support.',
    severity: 'error',
  },
  PGRST301: {
    message: 'Session expirée',
    description: 'Veuillez vous reconnecter.',
    severity: 'warning',
  },
};

const NETWORK_PATTERNS: Array<{ pattern: RegExp; config: ErrorConfig }> = [
  {
    pattern: /Failed to fetch|NetworkError|ERR_NETWORK/i,
    config: {
      message: 'Connexion perdue',
      description: 'Vérifiez votre connexion internet.',
      severity: 'warning',
    },
  },
  {
    pattern: /timeout|ETIMEDOUT/i,
    config: {
      message: 'Délai dépassé',
      description: 'Le serveur met trop de temps à répondre.',
      severity: 'warning',
    },
  },
];

// Dedup: avoid spamming the same toast
let lastToastKey = '';
let lastToastTime = 0;
const DEDUP_MS = 3000;

function isDuplicate(key: string): boolean {
  const now = Date.now();
  if (key === lastToastKey && now - lastToastTime < DEDUP_MS) {
    return true;
  }
  lastToastKey = key;
  lastToastTime = now;
  return false;
}

/**
 * Show a user-facing toast for a Supabase error.
 * Returns true if the error was handled (toast shown), false otherwise.
 */
export function handleSupabaseError(error: unknown, context?: string): boolean {
  if (!error) return false;

  const err = error as {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
  };
  const code = err.code || '';
  const message = err.message || String(error);

  // Check known Postgres error codes
  const mapped = ERROR_MAP[code];
  if (mapped) {
    const key = `${code}:${context || ''}`;
    if (!isDuplicate(key)) {
      toast[mapped.severity](mapped.message, {
        description: mapped.description,
      });
    }
    if (context) console.error(`[${context}]`, error);
    return true;
  }

  // Check network patterns
  for (const { pattern, config } of NETWORK_PATTERNS) {
    if (pattern.test(message)) {
      const key = `net:${config.message}`;
      if (!isDuplicate(key)) {
        toast[config.severity](config.message, {
          description: config.description,
        });
      }
      return true;
    }
  }

  // Generic fallback for unknown errors with a code
  if (code) {
    const key = `generic:${code}`;
    if (!isDuplicate(key)) {
      toast.error('Une erreur est survenue', {
        description: context ? `Contexte : ${context}` : 'Veuillez réessayer.',
      });
    }
    console.error(`[Supabase ${code}]`, error);
    return true;
  }

  return false;
}

/**
 * Wrapper for Supabase queries that auto-handles errors.
 * Usage:
 *   const { data } = await safeQuery(() => supabase.from('x').select(), 'fetchProducts');
 */
export async function safeQuery<T>(
  queryFn: () => Promise<{ data: T; error: unknown }>,
  context?: string
): Promise<{ data: T | null; error: unknown }> {
  try {
    const result = await queryFn();
    if (result.error) {
      handleSupabaseError(result.error, context);
    }
    return result;
  } catch (err) {
    handleSupabaseError(err, context);
    return { data: null, error: err };
  }
}
