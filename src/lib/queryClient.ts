import { QueryClient } from '@tanstack/react-query';

/**
 * Shared QueryClient for the app and for imperative cache updates (e.g. auth → wishlist).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: 2,
      retryDelay: (attempt: number) =>
        Math.min(1000 * Math.pow(2, attempt), 8000),
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: true,
      networkMode: 'always',
    },
    mutations: {
      retry: 0,
      networkMode: 'always',
    },
  },
});
