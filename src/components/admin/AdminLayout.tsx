import { useState, useEffect } from "react";
import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
  Megaphone
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const AdminLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check authentication
    const isAuth = localStorage.getItem("adminAuth");
    if (!isAuth) {
      navigate("/admin/login");
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("adminAuth");
    toast.success("Déconnexion réussie");
    navigate("/admin/login");
  };

  const menuItems = [
    {
      icon: LayoutDashboard,
      label: "Tableau de bord",
      path: "/admin/dashboard",
    },
    {
      icon: Package,
      label: "Produits",
      path: "/admin/products",
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
      icon: BarChart3,
      label: "Analyses",
      path: "/admin/analytics",
    },
    {
      icon: Settings,
      label: "Paramètres",
      path: "/admin/settings",
    },
  ];

  const Sidebar = ({ className }: { className?: string }) => (
    <div className={cn("bg-white border-r border-stone-200 h-full", className)}>
      <div className="p-6 border-b border-stone-200">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-olive-100">
            <Leaf className="h-5 w-5 text-olive-600" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-semibold text-stone-800">
              Admin Panel
            </h2>
            <p className="text-xs text-stone-500">Rif Raw Straw</p>
          </div>
        </div>
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
                  ? "bg-olive-50 text-olive-700 border border-olive-200" 
                  : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
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
          className="w-full justify-start text-stone-600 border-stone-300"
        >
          <LogOut className="h-4 w-4 mr-3" />
          Déconnexion
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50 flex">
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
        <header className="bg-white border-b border-stone-200 px-6 py-4">
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
                <h1 className="text-xl font-semibold text-stone-800">
                  Administration
                </h1>
                <p className="text-sm text-stone-500">
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