// File_name: src/App.tsx

import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import About from "./pages/About";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import CGV from "./pages/CGV";
import Cart from "./pages/Cart";
import { CartProvider } from "@/context/CartContext";
import Checkout from "./pages/Checkout";
import Contact from "./pages/Contact";
import { ErrorBoundary } from "react-error-boundary";
import FAQ from "./pages/FAQ";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ProductDetail from "./pages/ProductDetail";
import Products from "./pages/Products";
import React from "react";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import Returns from "./pages/Returns";
import Shipping from "./pages/Shipping";
import { Toaster as Sonner } from "@/components/ui/sonner";
import Story from "./pages/Story";
import Terms from "./pages/Terms";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Admin imports
import AdminLogin from "./pages/admin/AdminLogin";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminCustomers from "./pages/admin/AdminCustomers";
import AdminAnalytics from "./pages/admin/AdminAnalytics";

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
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/products" element={<Products />} />
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
            <Route path="/admin" element={<AdminLayout />}>
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="customers" element={<AdminCustomers />} />
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
