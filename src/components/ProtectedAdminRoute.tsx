import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { logAccessDenied } from '@/lib/rbac';

interface ProtectedAdminRouteProps {
  children: ReactNode;
}

export const ProtectedAdminRoute = ({ children }: ProtectedAdminRouteProps) => {
  const { isAuthenticated, isLoading } = useAdminAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Vérification des accès…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    logAccessDenied('anonymous', 'ProtectedAdminRoute');
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};
