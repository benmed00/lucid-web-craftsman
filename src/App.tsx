// src/app.tsx

import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import Blog from "./pages/Blog";
import Cart from "./pages/Cart";
import { CartProvider } from "@/context/CartContext"; // Ajout du contexte panier
import Checkout from "./pages/Checkout";
import Contact from "./pages/Contact";
import { ErrorBoundary } from "react-error-boundary";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ProductDetail from "./pages/ProductDetail";
import Products from "./pages/Products";
import React from "react";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Ajouter un Error Boundary au niveau supérieur

// Pages

// UI Components

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <CartProvider>
      {/* Ajout du fournisseur de contexte */}
      <TooltipProvider delayDuration={300}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/contact" element={<Contact />} />

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

// Composant de fallback pour les erreurs
const ErrorFallback = () => (
  <div className="p-4 bg-red-50 text-red-700">
    <h2>Une erreur critique est survenue</h2>
    <p>Veuillez recharger la page ou contacter le support</p>
  </div>
);

export default App;
