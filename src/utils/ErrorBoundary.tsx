// File_name: src\utils\ErrorBoundary.tsx
// Description: Error boundary component for handling errors in React components.
// This component wraps other components and catches any errors that occur during rendering.
// It provides a fallback UI when errors occur, preventing the entire app from crashing.

import React from 'react';

// Interface defining the props that the ErrorBoundary component accepts
interface ErrorBoundaryProps {
    // Fallback UI to show when an error occurs
    fallback: React.ReactNode;
    // Child components to wrap and protect from errors
    children?: React.ReactNode;  // This is optional
}

interface State {
  hasError: boolean;
  error?: Error;
}

// ErrorBoundary component that extends React.Component
// Uses intersection type to ensure children prop is required
export class ErrorBoundary extends React.Component<ErrorBoundaryProps & { children: React.ReactNode }, { hasError: boolean }> {
    // Initial state to track if an error has occurred
    state: State = { hasError: false };
  
    // Static method called when an error occurs during rendering
    // Returns state to update when an error is caught
    static getDerivedStateFromError(error: Error): State {
      return { hasError: true, error };
    }
  
    // Lifecycle method called when an error is caught
    // Logs error details to the console
    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      console.error('ErrorBoundary caught:', error, errorInfo);
    }
  
    // Render method that displays either the fallback UI or children
    render() {
      if (this.state.hasError) {
        return (
          <div className="error-fallback">
            <h2>Something went wrong</h2>
            <p>{this.state.error?.message}</p>
            <button onClick={() => this.setState({ hasError: false })}>
              Try again
            </button>
          </div>
        );
      }

      return this.props.children;
    }
  }