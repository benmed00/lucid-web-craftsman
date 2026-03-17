import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import {
  isHydrationError,
  purgeAllPersistedStores,
  getDiagnosticLog,
} from '@/lib/storage/StorageGuard';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  selfHealAttempted: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    selfHealAttempted: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);

    // Self-healing: if this is a hydration/hook-order error, purge stores and auto-reload
    if (isHydrationError(error) && !this.state.selfHealAttempted) {
      console.warn(
        '[ErrorBoundary] Hydration error detected — triggering self-heal'
      );
      purgeAllPersistedStores(
        'boundary_reset',
        `Hydration error: ${error.message}`
      );

      this.setState({ selfHealAttempted: true });

      // Brief delay so the user sees a flash rather than infinite loop
      setTimeout(() => {
        window.location.reload();
      }, 300);
      return;
    }

    // Log diagnostic info for analysis
    const diagnostics = getDiagnosticLog();
    if (diagnostics.length > 0) {
      console.info('[ErrorBoundary] StorageGuard diagnostics:', diagnostics);
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: undefined,
      selfHealAttempted: false,
    });
  };

  private handlePurgeAndReload = () => {
    purgeAllPersistedStores(
      'boundary_reset',
      'User-initiated purge from error screen'
    );
    window.location.reload();
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-full bg-destructive/10">
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                </div>
              </div>
              <CardTitle className="text-xl text-foreground">
                Une erreur s'est produite
              </CardTitle>
              <CardDescription>
                L'application a rencontré une erreur inattendue.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.state.error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive font-mono break-words">
                    {this.state.error.message}
                  </p>
                </div>
              )}
              <div className="flex flex-col gap-2">
                <Button
                  onClick={this.handleRetry}
                  variant="outline"
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Réessayer
                </Button>
                <Button onClick={this.handleReload} className="w-full">
                  Recharger la page
                </Button>
                <Button
                  onClick={this.handlePurgeAndReload}
                  variant="ghost"
                  className="w-full text-xs text-muted-foreground"
                >
                  Réinitialiser et recharger
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
