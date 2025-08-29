/**
 * Production Error Suppression Utilities
 * Reduces console noise in production while preserving important errors
 */

interface SuppressedWarning {
  pattern: RegExp;
  level: 'info' | 'warn' | 'error';
  reason: string;
}

const suppressedWarnings: SuppressedWarning[] = [
  {
    pattern: /Image fallback used:/,
    level: 'warn',
    reason: 'Expected fallback behavior for missing images'
  },
  {
    pattern: /was preloaded using link preload but not used/,
    level: 'warn', 
    reason: 'Resource optimization - unused preloads are cleaned up automatically'
  },
  {
    pattern: /Firestore.*WebChannelConnection.*transport errored/,
    level: 'warn',
    reason: 'External service connection issue - handled gracefully'
  },
  {
    pattern: /Max reconnect attempts.*exceeded/,
    level: 'warn',
    reason: 'External service reconnection limit - handled gracefully'
  },
  {
    pattern: /Failed to execute 'postMessage'.*target origin/,
    level: 'warn',
    reason: 'Cross-origin messaging - expected in iframe environments'
  },
  {
    pattern: /Unrecognized feature:/,
    level: 'warn',
    reason: 'Browser feature compatibility warnings'
  }
];

export function setupProductionErrorSuppression() {
  if (process.env.NODE_ENV !== 'production') {
    return; // Only suppress in production
  }

  // Store original console methods
  const originalWarn = console.warn;
  const originalError = console.error;
  const originalInfo = console.info;

  // Override console.warn
  console.warn = (...args: any[]) => {
    const message = args.join(' ');
    const shouldSuppress = suppressedWarnings.some(
      (warning) => warning.level === 'warn' && warning.pattern.test(message)
    );
    
    if (!shouldSuppress) {
      originalWarn.apply(console, args);
    }
  };

  // Override console.error (be more selective)
  console.error = (...args: any[]) => {
    const message = args.join(' ');
    const shouldSuppress = suppressedWarnings.some(
      (warning) => warning.level === 'error' && warning.pattern.test(message)
    );
    
    if (!shouldSuppress) {
      originalError.apply(console, args);
    }
  };

  // Override console.info
  console.info = (...args: any[]) => {
    const message = args.join(' ');
    const shouldSuppress = suppressedWarnings.some(
      (warning) => warning.level === 'info' && warning.pattern.test(message)
    );
    
    if (!shouldSuppress) {
      originalInfo.apply(console, args);
    }
  };
}

// Export for manual error checking in development
export function isDevelopmentWarning(message: string): boolean {
  return suppressedWarnings.some(warning => warning.pattern.test(message));
}