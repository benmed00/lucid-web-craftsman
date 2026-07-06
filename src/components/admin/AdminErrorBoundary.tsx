/**
 * AdminErrorBoundary — capture les erreurs de rendu dans la zone /admin,
 * affiche un fallback dédié (contexte administrateur) et déclenche un toast
 * harmonisé via `handleSupabaseError` pour couvrir les erreurs de fetch/mutation
 * remontées jusqu'au boundary.
 */
import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { handleSupabaseError } from '@/lib/supabaseErrorHandler';
import { toast } from 'sonner';

interface Props {
  children: React.ReactNode;
  /** Contexte affiché dans les logs / toasts (ex: 'admin/orders'). */
  context?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AdminErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[AdminErrorBoundary]', this.props.context, error, info);
    const handled = handleSupabaseError(
      error,
      this.props.context ?? 'admin'
    );
    if (!handled) {
      toast.error("Une erreur d'administration est survenue", {
        description: error.message?.slice(0, 160),
      });
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-card border border-border rounded-lg p-6 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">
              Erreur dans l'administration
            </h2>
            <p className="text-sm text-muted-foreground">
              Le module admin a rencontré une erreur inattendue. Vos données ne
              sont pas perdues — rechargez ou réessayez.
            </p>
            {this.state.error?.message && (
              <p className="text-xs text-muted-foreground/80 font-mono mt-2 break-all">
                {this.state.error.message.slice(0, 200)}
              </p>
            )}
          </div>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" size="sm" onClick={this.handleReset}>
              Réessayer
            </Button>
            <Button size="sm" onClick={this.handleReload}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Recharger
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

export default AdminErrorBoundary;
