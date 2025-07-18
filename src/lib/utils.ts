import { clsx, type ClassValue } from "clsx"
import React from "react";
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const BASE_PATH = "/lucid-web-craftsman";

// Ajoute ceci en haut du fichier (avant le composant)
declare global {
  interface Window {
    __cartFallback?: never;
  }
}

// Composant ErrorBoundary pour la gestion des erreurs
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

  static getDerivedStateFromError(__: Error) { // Prefixed _
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _errorInfo: React.ErrorInfo) { // Prefixed error and errorInfo
    // Vous pouvez loguer l'erreur ici si besoin
    // console.error(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}