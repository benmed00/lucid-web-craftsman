import { useState, useEffect } from "react";
import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Settings, 
  LogOut, 
  Menu,
  Leaf,
  Users,
  BarChart3,
  Warehouse,
  Megaphone,
  User,
  Image,
  AlertTriangle,
  Tag,
  Mail,
  Star,
  Activity,
  FileText,
  Languages
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useOrderNotifications } from "@/hooks/useOrderNotifications";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAuth } from "@/hooks/useAdminAuth";

const AdminLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user: adminUser, isAuthenticated, isLoading } = useAdminAuth();
  const { signOut } = useAuth();
  
  // Initialize order notifications
  useOrderNotifications();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/admin/login", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Déconnexion réussie");
    } catch (error) {
      // Silent error handling for production
      // Force redirect even if logout fails
      navigate("/admin/login", { replace: true });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
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

  const menuItems = [
    {
      icon: LayoutDashboard,
      label: "Tableau de bord",
      path: "/admin",
    },
    {
      icon: Package,
      label: "Produits",
      path: "/admin/products",
    },
    {
      icon: FileText,
      label: "Catalogue Complet",
      path: "/admin/catalog",
    },
    {
      icon: Image,
      label: "Image Principale",
      path: "/admin/hero-image",
    },
    {
      icon: Warehouse,
      label: "Stocks",
      path: "/admin/inventory",
    },
    {
      icon: ShoppingCart,
      label: "Commandes",
      path: "/admin/orders",
    },
    {
      icon: Users,
      label: "Clients",
      path: "/admin/customers",
    },
    {
      icon: Megaphone,
      label: "Marketing",
      path: "/admin/marketing",
    },
    {
      icon: Tag,
      label: "Codes Promo",
      path: "/admin/promo-codes",
    },
    {
      icon: BarChart3,
      label: "Analyses",
      path: "/admin/analytics",
    },
    {
      icon: Star,
      label: "Avis clients",
      path: "/admin/reviews",
    },
    {
      icon: Languages,
      label: "Traductions",
      path: "/admin/translations",
    },
    {
      icon: AlertTriangle,
      label: "Rapports d'erreurs",
      path: "/admin/error-reports",
    },
    {
      icon: Mail,
      label: "Tests Emails",
      path: "/admin/email-testing",
    },
    {
      icon: Activity,
      label: "Statut APIs",
      path: "/admin/api-status",
    },
    {
      icon: Settings,
      label: "Paramètres",
      path: "/admin/settings",
    },
  ];

  const Sidebar = ({ className }: { className?: string }) => (
    <div className={cn("bg-card border-r border-border h-full", className)}>
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

      <nav className="p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
                isActive 
                  ? "bg-primary/10 text-primary border border-primary/20" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-4 left-4 right-4">
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
    <div className="min-h-screen bg-background flex">
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
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;