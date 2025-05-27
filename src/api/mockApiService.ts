
// File_name: src/api/mockApiService.ts

import axios, { AxiosInstance } from "axios";

import { IProduct } from "../shared/interfaces/Iproduct.interface";
import { products as localProducts } from "./data/products";
import { CartState, ICartItem } from "@/shared/interfaces/ICart.interface";

// Helper to simulate API latency
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Create axios instance for any external API calls if needed in the future
const api: AxiosInstance = axios.create({
  baseURL: "https://api.example.com", // This won't be used for now
  headers: {
    "Content-Type": "application/json",
  },
});

// Blog posts API - using in-memory data
export const getBlogPosts = async () => {
  try {
    await delay(300); // Simulate network latency
    // Get blog posts from db.json (imported at runtime)
    const response = await import("./data/blogPosts");
    return response.default;
  } catch (error) {
    console.error("Error fetching blog posts:", error);
    throw error;
  }
};

export const getBlogPostById = async (id: number) => {
  try {
    await delay(200);
    const response = await import("./data/blogPosts");
    const post = response.default.find(post => post.id === id);
    return post || null;
  } catch (error) {
    console.error(`Post with ID ${id} not found`, error);
    return null;
  }
};

// Products API - using in-memory data
export const getProducts = async (): Promise<IProduct[]> => {
  try {
    await delay(300); // Simulate network latency
    return localProducts; // Use local products data directly
  } catch (error) {
    console.error("Error fetching products:", error);
    throw error;
  }
};

export const getProductById = async (id: number): Promise<IProduct | null> => {
  try {
    await delay(200);
    const product = localProducts.find(product => product.id === id);
    return product || null;
  } catch (error) {
    console.error(`Product with ID ${id} not found`, error);
    return null;
  }
};

export const getCart = async (): Promise<CartState> => {
  await delay(100);

  try {
    const cart = localStorage.getItem("cart");
    const parsedCart = cart ? JSON.parse(cart) : { items: [] };
    const total = parsedCart.items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    return { ...parsedCart, total };
  } catch (error) {
    console.error("Error getting cart from localStorage:", error);
    return { items: [], total: 0 };
  }
};

export const addToCart = async (product: IProduct, quantity: number = 1): Promise<CartState> => {
  await delay(100);

  // Get current cart
  const cart: CartState = await getCart();

  // Find if product is already in cart
  const existingItem: ICartItem = cart.items.find(item => item.id === product.id);

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

  // Calculate total
  const total = cart.items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  // Save to localStorage
  localStorage.setItem("cart", JSON.stringify({ ...cart, total }));
  return { ...cart, total };
};

export const removeFromCart = async (productId: number): Promise<CartState> => {
  await delay(100);

  // Get current cart
  const cart: CartState = await getCart();

  // Remove product from cart
  cart.items = cart.items.filter(item => item.id !== productId);

  // Calculate total
  const total = cart.items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  // Save to localStorage
  localStorage.setItem("cart", JSON.stringify({ ...cart, total }));
  return { ...cart, total };
};

export const updateCartStateItemQuantity = async (productId: number, quantity: number): Promise<CartState> => {
  await delay(100);

  // Get current cart
  const cart: CartState = await getCart();

  // Find item
  const item = cart.items.find(item => item.id === productId);

  if (item) {
    // Update quantity
    item.quantity = Math.max(1, quantity);
  }

  // Calculate total
  const total = cart.items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  // Save to localStorage
  localStorage.setItem("cart", JSON.stringify({ ...cart, total }));
  return { ...cart, total };
};
