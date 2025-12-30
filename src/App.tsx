// File_name: src/App.tsx

import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useWebVitals } from "@/hooks/useWebVitals";
import { useMaintenanceMode } from "@/hooks/useMaintenanceMode";
import { lazy, Suspense, startTransition, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { taskScheduler } from "@/utils/taskScheduler";
import { mainThreadOptimizer } from "@/utils/mainThreadOptimizer";
import { inputResponsivenessOptimizer } from "@/utils/inputResponsivenessOptimizer";

// Critical pages loaded immediately
import Index from "./pages/Index";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Maintenance from "./pages/Maintenance";

// Non-critical pages lazy loaded
const About = lazy(() => import("./pages/About"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const CGV = lazy(() => import("./pages/CGV"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Contact = lazy(() => import("./pages/Contact"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Auth = lazy(() => import("./pages/Auth"));
const EnhancedProfile = lazy(() => import("./pages/EnhancedProfile"));
const OrderHistory = lazy(() => import("./pages/OrderHistory"));
const Returns = lazy(() => import("./pages/Returns"));
const Shipping = lazy(() => import("./pages/Shipping"));
const Story = lazy(() => import("./pages/Story"));
const Terms = lazy(() => import("./pages/Terms"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Essential context providers
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { WishlistProvider } from "@/context/WishlistContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import TTIOptimizer from "@/components/performance/TTIOptimizer";


// PWA Components - lazy loaded since not critical for initial render
const PWAInstallPrompt = lazy(() => import("@/components/ui/PWAInstallPrompt").then(m => ({ default: m.PWAInstallPrompt })));
const OfflineManager = lazy(() => import("@/components/ui/OfflineManager").then(m => ({ default: m.OfflineManager })));
const PushNotificationManager = lazy(() => import("@/components/ui/PushNotificationManager").then(m => ({ default: m.PushNotificationManager })));

// Navigation (persistent across routes)
import Navigation from "@/components/Navigation";

// Admin imports - lazy loaded since admin pages are rarely accessed
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const ProtectedAdminRoute = lazy(() => import("./components/ProtectedAdminRoute").then(m => ({ default: m.ProtectedAdminRoute })));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminCustomers = lazy(() => import("./pages/admin/AdminCustomers"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminInventory = lazy(() => import("./pages/admin/AdminInventory"));
const AdminMarketing = lazy(() => import("./pages/admin/AdminMarketing"));
const AdminHeroImage = lazy(() => import("./pages/admin/AdminHeroImage"));
const AdminErrorReports = lazy(() => import("./pages/admin/AdminErrorReports"));
const AdminPromoCodes = lazy(() => import("./pages/admin/AdminPromoCodes"));
const AdminEmailTesting = lazy(() => import("./pages/admin/AdminEmailTesting"));

// Loading fallback component
const PageLoadingFallback = () => (
  <div className="min-h-screen bg-background p-4">
    <div className="container mx-auto space-y-4">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-64 w-full" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </div>
  </div>
);

// Optimized React Query configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes cache retention
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: true,
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: 0,
    },
  },
});

const basePath: string = "/";

// Wrapper component to handle maintenance mode check inside Router context
const MaintenanceWrapper = ({ children }: { children: React.ReactNode }) => {
  const { isMaintenanceMode, isLoading } = useMaintenanceMode();
  const location = useLocation();
  
  // Allow admin routes even in maintenance mode
  const isAdminRoute = location.pathname.startsWith('/admin');
  
  // Show a minimal loading state while checking maintenance mode
  if (isLoading) {
    return <div className="min-h-screen bg-background" />;
  }
  
  // If in maintenance mode and not an admin route, show maintenance page WITHOUT navigation
  if (isMaintenanceMode && !isAdminRoute) {
    return <Maintenance />;
  }
  
  // Normal operation: show navigation + children
  return (
    <>
      <Navigation />
      {children}
    </>
  );
};

const App = () => {
  // Initialize Web Vitals tracking
  useWebVitals();

  // Schedule non-critical initializations to avoid blocking main thread
  // Ultra-optimized initializations to prevent FID issues
  useEffect(() => {
    // Use input responsiveness optimizer for FID-safe initialization
    inputResponsivenessOptimizer.scheduleWhenIdle(async () => {
      // Break initialization into tiny chunks to prevent long tasks
      await inputResponsivenessOptimizer.executeWithYielding(async () => {
        try {
          // Process initialization data in small chunks
          await mainThreadOptimizer.executeInWorker('COMPRESS_DATA', {
            config: 'app_initialization',
            timestamp: Date.now()
          });
          console.log('App initialized with FID optimization');
        } catch (error) {
          console.log('App initialized with fallback processing');
        }
      }, { priority: 'background' });
    }, { timeout: 2000 });
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <Suspense fallback={<div className="min-h-screen bg-background" />}>
            <OfflineManager>
              <AuthProvider>
                <CurrencyProvider>
                  <CartProvider>
                    <WishlistProvider>
                      <TooltipProvider delayDuration={300}>
                      <BrowserRouter basename={basePath}>
                      <MaintenanceWrapper>
                        <Suspense fallback={null}>
                          <PushNotificationManager />
                          <PWAInstallPrompt />
                        </Suspense>


                        <Routes>
                        {/* Critical routes loaded immediately */}
                        <Route path="/" element={<Index />} />
                        <Route path="/products" element={<Products />} />
                        <Route path="/products/:id" element={<ProductDetail />} />
                        
                        {/* Non-critical routes with lazy loading */}
                        <Route path="/auth" element={<Suspense fallback={<PageLoadingFallback />}><Auth /></Suspense>} />
                        <Route path="/profile" element={<Suspense fallback={<PageLoadingFallback />}><EnhancedProfile /></Suspense>} />
                        <Route path="/enhanced-profile" element={<Suspense fallback={<PageLoadingFallback />}><EnhancedProfile /></Suspense>} />
                        <Route path="/orders" element={<Suspense fallback={<PageLoadingFallback />}><OrderHistory /></Suspense>} />
                        <Route path="/cart" element={<Suspense fallback={<PageLoadingFallback />}><Cart /></Suspense>} />
                        <Route path="/checkout" element={<Suspense fallback={<PageLoadingFallback />}><Checkout /></Suspense>} />
                        <Route path="/payment-success" element={<Suspense fallback={<PageLoadingFallback />}><PaymentSuccess /></Suspense>} />
                        <Route path="/wishlist" element={<Suspense fallback={<PageLoadingFallback />}><Wishlist /></Suspense>} />
                        <Route path="/blog" element={<Suspense fallback={<PageLoadingFallback />}><Blog /></Suspense>} />
                        <Route path="/blog/:id" element={<Suspense fallback={<PageLoadingFallback />}><BlogPost /></Suspense>} />
                        <Route path="/contact" element={<Suspense fallback={<PageLoadingFallback />}><Contact /></Suspense>} />
                        <Route path="/shipping" element={<Suspense fallback={<PageLoadingFallback />}><Shipping /></Suspense>} />
                        <Route path="/returns" element={<Suspense fallback={<PageLoadingFallback />}><Returns /></Suspense>} />
                        <Route path="/faq" element={<Suspense fallback={<PageLoadingFallback />}><FAQ /></Suspense>} />
                        <Route path="/about" element={<Suspense fallback={<PageLoadingFallback />}><About /></Suspense>} />
                        <Route path="/terms" element={<Suspense fallback={<PageLoadingFallback />}><Terms /></Suspense>} />
                        <Route path="/cgv" element={<Suspense fallback={<PageLoadingFallback />}><CGV /></Suspense>} />
                        <Route path="/story" element={<Suspense fallback={<PageLoadingFallback />}><Story /></Suspense>} />

                        {/* Admin routes with lazy loading */}
                        <Route path="/admin/login" element={<Suspense fallback={<PageLoadingFallback />}><AdminLogin /></Suspense>} />
                        <Route path="/admin" element={
                          <Suspense fallback={<PageLoadingFallback />}>
                            <ProtectedAdminRoute><AdminLayout /></ProtectedAdminRoute>
                          </Suspense>
                        }>
                          <Route index element={<Suspense fallback={<PageLoadingFallback />}><AdminDashboard /></Suspense>} />
                          <Route path="dashboard" element={<Suspense fallback={<PageLoadingFallback />}><AdminDashboard /></Suspense>} />
                          <Route path="products" element={<Suspense fallback={<PageLoadingFallback />}><AdminProducts /></Suspense>} />
                          <Route path="hero-image" element={<Suspense fallback={<PageLoadingFallback />}><AdminHeroImage /></Suspense>} />
                          <Route path="inventory" element={<Suspense fallback={<PageLoadingFallback />}><AdminInventory /></Suspense>} />
                          <Route path="orders" element={<Suspense fallback={<PageLoadingFallback />}><AdminOrders /></Suspense>} />
                          <Route path="customers" element={<Suspense fallback={<PageLoadingFallback />}><AdminCustomers /></Suspense>} />
                          <Route path="marketing" element={<Suspense fallback={<PageLoadingFallback />}><AdminMarketing /></Suspense>} />
                          <Route path="promo-codes" element={<Suspense fallback={<PageLoadingFallback />}><AdminPromoCodes /></Suspense>} />
                          <Route path="analytics" element={<Suspense fallback={<PageLoadingFallback />}><AdminAnalytics /></Suspense>} />
                          <Route path="error-reports" element={<Suspense fallback={<PageLoadingFallback />}><AdminErrorReports /></Suspense>} />
                          <Route path="email-testing" element={<Suspense fallback={<PageLoadingFallback />}><AdminEmailTesting /></Suspense>} />
                          <Route path="settings" element={<Suspense fallback={<PageLoadingFallback />}><AdminSettings /></Suspense>} />
                        </Route>

                        {/* Catch-all route for 404 pages */}
                        <Route path="*" element={<Suspense fallback={<PageLoadingFallback />}><NotFound /></Suspense>} />
                        </Routes>
                      </MaintenanceWrapper>
                    </BrowserRouter>
                    
                    {/* Système de notifications */}
                    <Toaster />
                    <Sonner richColors expand visibleToasts={3} />
                    
                    {/* TTI Optimizer - runs after everything else */}
                    <TTIOptimizer />

                    {/* Devtools React Query (en développement seulement) */}
                    {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
                    </TooltipProvider>
                  </WishlistProvider>
                </CartProvider>
              </CurrencyProvider>
            </AuthProvider>
          </OfflineManager>
          </Suspense>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

// Composant de fallback pour les erreurs
const ErrorFallback = () => (
  <div className="p-4 bg-red-50 text-red-700">
    <h2>Une erreur critique est survenue</h2>
    <p>Veuillez recharger la page ou contacter le support</p>
  </div>
);

export default App;
