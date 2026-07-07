import { useMemo, useState, useEffect } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { LogOut, Menu, Leaf, User } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import { useAuth } from '@/context/AuthContext';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import UIStyleSwitcher from '@/components/admin/UIStyleSwitcher';
import { AdminErrorBoundary } from '@/components/admin/AdminErrorBoundary';
import {
  filterAdminNavByRole,
  isAdminNavItemActive,
} from '@/config/adminNav';

const AdminLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user: adminUser, isAuthenticated, isLoading } = useAdminAuth();
  const { role, signOut } = useAuth();

  const menuGroups = useMemo(() => filterAdminNavByRole(role), [role]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/admin/login', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Déconnexion réussie');
    } catch (error) {
      // Silent error handling for production
      // Force redirect even if logout fails
      navigate('/admin/login', { replace: true });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }




  const Sidebar = ({ className }: { className?: string }) => (
    <div className={cn('bg-card border-r border-border h-full flex flex-col', className)}>
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Leaf className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="font-serif text-lg font-semibold text-foreground">
              Admin Panel
            </h2>
            <p className="text-xs text-muted-foreground">Rif Raw Straw</p>
          </div>
        </div>

        {adminUser && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {adminUser.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {adminUser.email}
                </p>
              </div>
              <Badge variant="secondary" className="text-xs">
                {adminUser.role}
              </Badge>
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {menuGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {group.label}
            </p>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = isAdminNavItemActive(item, location.pathname);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-sm',
                    isActive
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-border">
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full justify-start text-muted-foreground border-border"
        >
          <LogOut className="h-4 w-4 mr-3" />
          Déconnexion
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-background flex">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-64 relative">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="lg:hidden"
                    onClick={() => setIsMobileMenuOpen(true)}
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
              </Sheet>

              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  Administration
                </h1>
                <p className="text-sm text-muted-foreground">
                  Gestion de votre boutique artisanale
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <UIStyleSwitcher />
              <Link to="/" target="_blank">
                <Button variant="outline" size="sm">
                  Voir le site
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6">
          <AdminErrorBoundary context="admin">
            <Outlet />
          </AdminErrorBoundary>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
