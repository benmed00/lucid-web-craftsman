/**
 * Centralized Error Handling System
 * Provides consistent error types and handling across the application
 */

// Error severity levels
export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

// Error categories for better classification
export type ErrorCategory = 
  | 'network'
  | 'auth'
  | 'validation'
  | 'business'
  | 'system'
  | 'external';

// Base application error
export class AppError extends Error {
  public readonly code: string;
  public readonly severity: ErrorSeverity;
  public readonly category: ErrorCategory;
  public readonly context?: Record<string, unknown>;
  public readonly timestamp: Date;
  public readonly isOperational: boolean;
  public readonly originalError?: Error;

  constructor(
    message: string,
    options: {
      code?: string;
      severity?: ErrorSeverity;
      category?: ErrorCategory;
      context?: Record<string, unknown>;
      cause?: Error;
      isOperational?: boolean;
    } = {}
  ) {
    super(message);
    this.name = 'AppError';
    this.code = options.code || 'UNKNOWN_ERROR';
    this.severity = options.severity || 'error';
    this.category = options.category || 'system';
    this.context = options.context;
    this.timestamp = new Date();
    this.isOperational = options.isOperational ?? true;
    this.originalError = options.cause;

    // Maintains proper stack trace
    Error.captureStackTrace?.(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      severity: this.severity,
      category: this.category,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }
}

// Specific error types
export class NetworkError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, {
      code: 'NETWORK_ERROR',
      category: 'network',
      severity: 'warning',
      context,
    });
    this.name = 'NetworkError';
  }
}

export class AuthError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, {
      code: 'AUTH_ERROR',
      category: 'auth',
      severity: 'error',
      context,
    });
    this.name = 'AuthError';
  }
}

export class ValidationError extends AppError {
  public readonly fields?: Record<string, string>;

  constructor(
    message: string,
    fields?: Record<string, string>,
    context?: Record<string, unknown>
  ) {
    super(message, {
      code: 'VALIDATION_ERROR',
      category: 'validation',
      severity: 'warning',
      context: { ...context, fields },
    });
    this.name = 'ValidationError';
    this.fields = fields;
  }
}

export class BusinessError extends AppError {
  constructor(message: string, code: string, context?: Record<string, unknown>) {
    super(message, {
      code,
      category: 'business',
      severity: 'warning',
      context,
    });
    this.name = 'BusinessError';
  }
}

// Error handler utility
export function handleError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    // Check for common error patterns
    if (error.message.includes('Failed to fetch')) {
      return new NetworkError('Network request failed', { originalError: error.message });
    }
    if (error.message.includes('unauthorized') || error.message.includes('401')) {
      return new AuthError('Authentication required', { originalError: error.message });
    }

    return new AppError(error.message, {
      cause: error,
      isOperational: false,
    });
  }

  return new AppError('An unexpected error occurred', {
    context: { originalError: String(error) },
    isOperational: false,
  });
}

// Safe async wrapper
export async function trySafe<T>(
  fn: () => Promise<T>,
  fallback?: T
): Promise<[T, null] | [T | undefined, AppError]> {
  try {
    const result = await fn();
    return [result, null];
  } catch (error) {
    const appError = handleError(error);
    return [fallback, appError];
  }
}

// Sync version
export function trySafeSync<T>(
  fn: () => T,
  fallback?: T
): [T, null] | [T | undefined, AppError] {
  try {
    const result = fn();
    return [result, null];
  } catch (error) {
    const appError = handleError(error);
    return [fallback, appError];
  }
}
