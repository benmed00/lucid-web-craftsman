import axios, { AxiosInstance } from "axios";
import { BASE_URL } from "../config/constants"; // Import BASE_URL
import { Product } from "../shared/interfaces/Iproduct.interface";
// Removed: import { products as localProducts } from "../data/products";

// Helper to simulate API latency
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: BASE_URL, // Use imported BASE_URL
  headers: {
    "Content-Type": "application/json",
  },
});

// Blog posts API
export const getBlogPosts = async () => {
  try {
    await delay(300);
    const response = await api.get("/api/blogPosts");
    return response.data;
  } catch (error) {
    console.error("Error fetching blog posts:", error);
    throw error;
  }
};

export const getBlogPostById = async (id: number) => {
  try {
    await delay(200);
    const response = await api.get(`/api/blogPosts/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching blog post with ID ${id}:`, error);
    // json-server returns 404 if not found, axios will throw an error for that.
    // Depending on desired behavior, you might want to return null or let the error propagate.
    // For now, let's re-throw, components can handle it with error boundaries or try/catch.
    throw error;
  }
};

// Products API
export const getProducts = async (): Promise<Product[]> => {
  try {
    await delay(300);
    const response = await api.get("/api/products");
    return response.data;
  } catch (error) {
    console.error("Error fetching products:", error);
    throw error;
  }
};

export const getProductById = async (id: number): Promise<Product | null> => {
  try {
    await delay(200);
    const response = await api.get(`/api/products/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching product with ID ${id}:`, error);
    // Similar to getBlogPostById, re-throwing for now.
    throw error;
  }
};

// Cart API - using json-server
export interface CartItem {
  id: number; // Typically product ID
  quantity: number;
  product: Product; // Full product details, or just what's needed for cart display
}

export interface CartState {
  items: CartItem[];
  // Potentially other cart-level properties like total, discounts, etc.
  // For now, matching the simple structure from server.js { items: [] }
}

export const getCart = async (): Promise<CartState> => {
  await delay(100);
  try {
    const response = await api.get("/api/cart");
    // Ensure a cart object with items array is always returned
    return response.data && Array.isArray(response.data.items) ? response.data : { items: [] };
  } catch (error) {
    console.error("Error getting cart:", error);
    // Return an empty cart structure on error, as UI might expect it
    return { items: [] };
  }
};

export const addToCart = async (product: Product, quantity: number = 1): Promise<CartState> => {
  await delay(100);
  try {
    const cart: CartState = await getCart(); // Fetch current cart

    const existingItemIndex = cart.items.findIndex(item => item.id === product.id);

    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      cart.items.push({
        id: product.id,
        product: product, // Store the whole product object
        quantity: quantity,
      });
    }

    const response = await api.post("/api/cart", cart); // Post the entire updated cart
    return response.data;
  } catch (error) {
    console.error("Error adding to cart:", error);
    throw error;
  }
};

export const removeFromCart = async (productId: number): Promise<CartState> => {
  await delay(100);
  try {
    const cart: CartState = await getCart(); // Fetch current cart

    cart.items = cart.items.filter(item => item.id !== productId);

    const response = await api.post("/api/cart", cart); // Post the entire updated cart
    return response.data;
  } catch (error) {
    console.error("Error removing from cart:", error);
    throw error;
  }
};

export const updateCartItemQuantity = async (productId: number, quantity: number): Promise<CartState> => {
  await delay(100);
  try {
    const cart: CartState = await getCart(); // Fetch current cart

    const itemIndex = cart.items.findIndex(item => item.id === productId);

    if (itemIndex > -1) {
      if (quantity > 0) {
        cart.items[itemIndex].quantity = quantity;
      } else {
        // If quantity is 0 or less, remove the item
        cart.items.splice(itemIndex, 1);
      }
    }
    // If item not found, do nothing or throw error, current behavior is to do nothing.

    const response = await api.post("/api/cart", cart); // Post the entire updated cart
    return response.data;
  } catch (error) {
    console.error("Error updating cart item quantity:", error);
    throw error;
  }
};
