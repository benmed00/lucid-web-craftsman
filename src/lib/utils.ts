import { clsx, type ClassValue } from 'clsx';
import React from 'react';
import { toast } from 'sonner';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Keep in sync with `vite.config.ts` (`base`).
export const BASE_PATH = '/';

declare global {
  interface Window {
    __cartFallback?: never;
  }
}

interface ErrorBoundaryProps {
  fallback: React.ReactNode;
  children?: React.ReactNode;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  { hasError: boolean }
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: Error) {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _errorInfo: React.ErrorInfo) {
    console.error(_error, _errorInfo);
    toast.error('Une erreur est survenue. Veuillez réessayer.');
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
