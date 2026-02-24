/**
 * Centralized API Client
 * Provides consistent HTTP handling with error management, retries, and caching
 */

import { AppError, NetworkError, handleError } from '@/lib/errors/AppError';
import { EXTERNAL_SERVICES } from '@/config/app.config';

// Request configuration
interface RequestConfig extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

// Response wrapper
interface ApiResponse<T> {
  data: T;
  status: number;
  headers: Headers;
}

// Default configuration
const DEFAULT_CONFIG: Partial<RequestConfig> = {
  timeout: 30000,
  retries: 1,
  retryDelay: 1000,
  headers: {
    'Content-Type': 'application/json',
  },
};

// Timeout wrapper
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new NetworkError('Request timeout', { timeoutMs }));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

// Sleep utility for retries
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Main fetch function with retries
async function fetchWithRetry<T>(
  url: string,
  config: RequestConfig = {}
): Promise<ApiResponse<T>> {
  const {
    timeout = DEFAULT_CONFIG.timeout!,
    retries = DEFAULT_CONFIG.retries!,
    retryDelay = DEFAULT_CONFIG.retryDelay!,
    ...fetchConfig
  } = { ...DEFAULT_CONFIG, ...config };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await withTimeout(fetch(url, fetchConfig), timeout);

      if (!response.ok) {
        throw new NetworkError(
          `HTTP ${response.status}: ${response.statusText}`,
          {
            status: response.status,
            url,
          }
        );
      }

      const data = await response.json();
      return {
        data,
        status: response.status,
        headers: response.headers,
      };
    } catch (error) {
      lastError = error as Error;

      // Don't retry on client errors (4xx)
      if (error instanceof NetworkError && error.context?.status) {
        const status = error.context.status as number;
        if (status >= 400 && status < 500) {
          throw error;
        }
      }

      // Wait before retrying (except on last attempt)
      if (attempt < retries) {
        await sleep(retryDelay * (attempt + 1));
      }
    }
  }

  throw lastError || new NetworkError('Request failed after retries');
}

// API Client class
class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(
    baseUrl: string = '',
    defaultHeaders: Record<string, string> = {}
  ) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = defaultHeaders;
  }

  private buildUrl(path: string): string {
    if (path.startsWith('http')) return path;
    return `${this.baseUrl}${path}`;
  }

  async get<T>(path: string, config?: RequestConfig): Promise<T> {
    const response = await fetchWithRetry<T>(this.buildUrl(path), {
      ...config,
      method: 'GET',
      headers: { ...this.defaultHeaders, ...config?.headers },
    });
    return response.data;
  }

  async post<T>(
    path: string,
    body?: unknown,
    config?: RequestConfig
  ): Promise<T> {
    const response = await fetchWithRetry<T>(this.buildUrl(path), {
      ...config,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      headers: { ...this.defaultHeaders, ...config?.headers },
    });
    return response.data;
  }

  async put<T>(
    path: string,
    body?: unknown,
    config?: RequestConfig
  ): Promise<T> {
    const response = await fetchWithRetry<T>(this.buildUrl(path), {
      ...config,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      headers: { ...this.defaultHeaders, ...config?.headers },
    });
    return response.data;
  }

  async delete<T>(path: string, config?: RequestConfig): Promise<T> {
    const response = await fetchWithRetry<T>(this.buildUrl(path), {
      ...config,
      method: 'DELETE',
      headers: { ...this.defaultHeaders, ...config?.headers },
    });
    return response.data;
  }
}

// Pre-configured API clients for external services
export const currencyApi = new ApiClient(
  EXTERNAL_SERVICES.currency.frankfurter
);

// Default API client
export const apiClient = new ApiClient();

export { ApiClient, fetchWithRetry };
