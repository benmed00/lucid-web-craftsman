// File_name: src/App.tsx

import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useWebVitals } from "@/hooks/useWebVitals";


import About from "./pages/About";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import CGV from "./pages/CGV";
import Cart from "./pages/Cart";
import { CartProvider } from "@/context/CartContext";
import { CurrencyProvider } from "@/context/CurrencyContext";
import Checkout from "./pages/Checkout";
import Contact from "./pages/Contact";
import ErrorBoundary from "./components/ErrorBoundary";
import PaymentSuccess from "./pages/PaymentSuccess";
import Wishlist from "./pages/Wishlist";
import FAQ from "./pages/FAQ";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import EnhancedProfile from "./pages/EnhancedProfile";
import OrderHistory from "./pages/OrderHistory";
import NotFound from "./pages/NotFound";
import ProductDetail from "./pages/ProductDetail";
import Products from "./pages/Products";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import Returns from "./pages/Returns";
import Shipping from "./pages/Shipping";
import { Toaster as Sonner } from "@/components/ui/sonner";
import Story from "./pages/Story";
import Terms from "./pages/Terms";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";


// PWA Components
import { PWAInstallPrompt } from "@/components/ui/PWAInstallPrompt";
import { OfflineManager } from "@/components/ui/OfflineManager";
import { PushNotificationManager } from "@/components/ui/PushNotificationManager";

// Admin imports
import AdminLogin from "./pages/admin/AdminLogin";
import AdminLayout from "./components/admin/AdminLayout";
import { ProtectedAdminRoute } from "./components/ProtectedAdminRoute";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminCustomers from "./pages/admin/AdminCustomers";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminInventory from "./pages/admin/AdminInventory";
import AdminMarketing from "./pages/admin/AdminMarketing";
import AdminHeroImage from "./pages/admin/AdminHeroImage";
import AdminErrorReports from "./pages/admin/AdminErrorReports";

// Enhanced React Query configuration for optimized caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 10, // 10 minutes - longer for better performance
      gcTime: 1000 * 60 * 15, // 15 minutes cache retention
      retry: (failureCount, error: any) => {
        // Don't retry on auth errors
        if (error?.status === 401 || error?.status === 403) return false;
        return failureCount < 2; // Max 2 retries
      },
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

const basePath: string = "/";

const App = () => {
  // Initialize Web Vitals tracking
  useWebVitals();

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <OfflineManager>
            <CurrencyProvider>
              <CartProvider>
                <TooltipProvider delayDuration={300}>
                  <BrowserRouter basename={basePath}>
                    <PushNotificationManager />
                    <PWAInstallPrompt />
                    <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/products" element={<Products />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/profile" element={<EnhancedProfile />} />
            <Route path="/enhanced-profile" element={<EnhancedProfile />} />
            <Route path="/orders" element={<OrderHistory />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:id" element={<BlogPost />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/shipping" element={<Shipping />} />
            <Route path="/returns" element={<Returns />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/about" element={<About />} />

            <Route path="/terms" element={<Terms />} />
            <Route path="/cgv" element={<CGV />} />
            <Route path="/story" element={<Story />} />

            {/* Admin routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<ProtectedAdminRoute><AdminLayout /></ProtectedAdminRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="hero-image" element={<AdminHeroImage />} />
              <Route path="inventory" element={<AdminInventory />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="customers" element={<AdminCustomers />} />
              <Route path="marketing" element={<AdminMarketing />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="error-reports" element={<AdminErrorReports />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>

            {/* <Route path="/products/bags" element={<BagsPage />} />
            <Route path="/products/hats" element={<HatsPage />} /> */}

            {/* Catch-all route for 404 pages */}
            <Route path="*" element={<NotFound />} />
                    </Routes>
                    
                  </BrowserRouter>

                  {/* Système de notifications */}
                  <Toaster />
                  <Sonner richColors expand visibleToasts={3} />

                  {/* Devtools React Query (en développement seulement) */}
                  {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
                </TooltipProvider>
              </CartProvider>
            </CurrencyProvider>
        </OfflineManager>
      </QueryClientProvider>
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
