// File_name: src/App.tsx

import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { Suspense, lazy } from "react";

import { CartProvider } from "@/context/CartContext";
import { ErrorBoundary } from "react-error-boundary";
import { ProtectedAdminRoute } from "./components/ProtectedAdminRoute";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Lazy-loaded page components
const About = lazy(() => import("./pages/About"));
const Auth = lazy(() => import("./pages/Auth"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const CGV = lazy(() => import("./pages/CGV"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Contact = lazy(() => import("./pages/Contact"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Products = lazy(() => import("./pages/Products"));
const Profile = lazy(() => import("./pages/Profile"));
const Returns = lazy(() => import("./pages/Returns"));
const Shipping = lazy(() => import("./pages/Shipping"));
const Story = lazy(() => import("./pages/Story"));
const Terms = lazy(() => import("./pages/Terms"));

// Lazy-loaded admin components
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminCustomers = lazy(() => import("./pages/admin/AdminCustomers"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminHeroImage = lazy(() => import("./pages/admin/AdminHeroImage"));
const AdminInventory = lazy(() => import("./pages/admin/AdminInventory"));
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminMarketing = lazy(() => import("./pages/admin/AdminMarketing"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));

// Configuration de React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const basePath: string = "/";

const App = () => {
  console.log("App component is rendering, basePath:", basePath);
  return (
  <QueryClientProvider client={queryClient}>
    <CartProvider>
      <TooltipProvider delayDuration={300}>
        <BrowserRouter basename={basePath}>
          <Suspense
            fallback={
              <div className="flex h-screen items-center justify-center">
                Loading...
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/products" element={<Products />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/products/:id" element={<ProductDetail />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:id" element={<BlogPost />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/shipping" element={<Shipping />} />
              <Route path="/returns" element={<Returns />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/about" element={<About />} />
              <Route path="*" element={<NotFound />} />

              <Route path="/terms" element={<Terms />} />
              <Route path="/cgv" element={<CGV />} />
              <Route path="/story" element={<Story />} />

              {/* Admin routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route
                path="/admin"
                element={
                  <ProtectedAdminRoute>
                    <AdminLayout />
                  </ProtectedAdminRoute>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="hero-image" element={<AdminHeroImage />} />
                <Route path="inventory" element={<AdminInventory />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="customers" element={<AdminCustomers />} />
                <Route path="marketing" element={<AdminMarketing />} />
                <Route path="analytics" element={<AdminAnalytics />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>

              {/* <Route path="/products/bags" element={<BagsPage />} />
            <Route path="/products/hats" element={<HatsPage />} /> */}

              {/* Gestion des erreurs globale */}
              <Route
                path="*"
                element={
                  <ErrorBoundary fallback={<ErrorFallback />}>
                    <NotFound />
                  </ErrorBoundary>
                }
              />
            </Routes>
          </Suspense>
        </BrowserRouter>

        {/* Système de notifications */}
        <Toaster />
        <Sonner richColors expand visibleToasts={3} />

        {/* Devtools React Query (en développement seulement) */}
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </TooltipProvider>
    </CartProvider>
  </QueryClientProvider>
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
