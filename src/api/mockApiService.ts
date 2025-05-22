
import { Product } from "../shared/interfaces/Iproduct.interface";
import axios from "axios";

// Base API URL
const API_URL = "http://localhost:3001/api";

// Helper to simulate API latency
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Blog posts API
export const getBlogPosts = async () => {
  try {
    await delay(300); // Simulate network latency
    const response = await api.get("/posts");
    return response.data;
  } catch (error) {
    console.error("Error fetching blog posts:", error);
    throw error;
  }
};

export const getBlogPostById = async (id: number) => {
  try {
    await delay(200);
    const response = await api.get(`/posts/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Post with ID ${id} not found`, error);
    return null;
  }
};

// Products API
export const getProducts = async () => {
  try {
    await delay(300);
    const response = await api.get("/products");
    return response.data;
  } catch (error) {
    console.error("Error fetching products:", error);
    throw error;
  }
};

export const getProductById = async (id: number) => {
  try {
    await delay(200);
    const response = await api.get(`/products/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Product with ID ${id} not found`, error);
    return null;
  }
};

// Cart API - using localStorage as storage and API endpoints
export interface CartItem {
  id: number;
  quantity: number;
  product: Product;
}

export interface CartState {
  items: CartItem[];
}

// Fallback to localStorage if API is not available
const useLocalStorageFallback = (operation: () => Promise<any>, fallbackAction: () => any) => {
  return async () => {
    try {
      return await operation();
    } catch (error) {
      console.warn("API unavailable, using localStorage fallback");
      return fallbackAction();
    }
  };
};

export const getCart = async (): Promise<CartState> => {
  await delay(100);
  
  const getCartFromApi = async () => {
    const response = await api.get("/cart");
    return response.data;
  };
  
  const getCartFromLocalStorage = () => {
    try {
      const cart = localStorage.getItem("cart");
      return cart ? JSON.parse(cart) : { items: [] };
    } catch (error) {
      console.error("Error getting cart from localStorage:", error);
      return { items: [] };
    }
  };
  
  return useLocalStorageFallback(getCartFromApi, getCartFromLocalStorage)();
};

export const addToCart = async (product: Product, quantity: number = 1): Promise<CartState> => {
  await delay(100);
  
  // Get current cart
  let cart = await getCart();
  
  // Find if product is already in cart
  const existingItem = cart.items.find(item => item.id === product.id);
  
  if (existingItem) {
    // Update quantity if product already exists
    existingItem.quantity += quantity;
  } else {
    // Add new item to cart
    cart.items.push({
      id: product.id,
      quantity,
      product
    });
  }
  
  // Try to save to API, fallback to localStorage
  const saveCartToApi = async () => {
    const response = await api.post("/cart", cart);
    return response.data;
  };
  
  const saveCartToLocalStorage = () => {
    localStorage.setItem("cart", JSON.stringify(cart));
    return cart;
  };
  
  return useLocalStorageFallback(saveCartToApi, saveCartToLocalStorage)();
};

export const removeFromCart = async (productId: number): Promise<CartState> => {
  await delay(100);
  
  // Get current cart
  let cart = await getCart();
  
  // Remove product from cart
  cart.items = cart.items.filter(item => item.id !== productId);
  
  // Try to save to API, fallback to localStorage
  const saveCartToApi = async () => {
    const response = await api.post("/cart", cart);
    return response.data;
  };
  
  const saveCartToLocalStorage = () => {
    localStorage.setItem("cart", JSON.stringify(cart));
    return cart;
  };
  
  return useLocalStorageFallback(saveCartToApi, saveCartToLocalStorage)();
};

export const updateCartItemQuantity = async (productId: number, quantity: number): Promise<CartState> => {
  await delay(100);
  
  // Get current cart
  let cart = await getCart();
  
  // Find item
  const item = cart.items.find(item => item.id !== productId);
  
  if (item) {
    // Update quantity
    item.quantity = Math.max(1, quantity);
  }
  
  // Try to save to API, fallback to localStorage
  const saveCartToApi = async () => {
    const response = await api.post("/cart", cart);
    return response.data;
  };
  
  const saveCartToLocalStorage = () => {
    localStorage.setItem("cart", JSON.stringify(cart));
    return cart;
  };
  
  return useLocalStorageFallback(saveCartToApi, saveCartToLocalStorage)();
};
