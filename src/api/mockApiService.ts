import { Product } from "../shared/interfaces/Iproduct.interface";
import { blogPosts } from "@/data/blogPosts";
import { products } from "@/data/products";

// Helper to simulate API latency
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Blog posts API
export const getBlogPosts = async () => {
  await delay(300); // Simulate network latency
  return blogPosts;
};

export const getBlogPostById = async (id: number) => {
  await delay(200);
  const post = blogPosts.find((post) => post.id === id);
  if (!post) {
    console.error(`Post with ID ${id} not found`);
  }
  return post || null;
};

// Products API
export const getProducts = async () => {
  await delay(300);
  return products;
};

export const getProductById = async (id: number) => {
  await delay(200);
  return products.find((product) => product.id === id) || null;
};

// Cart API - using localStorage as storage
export interface CartItem {
  id: number;
  quantity: number;
  product: Product;
}

export interface CartState {
  items: CartItem[];
}

export const getCart = async (): Promise<CartState> => {
  await delay(100);
  try {
    const cart = localStorage.getItem("cart");
    return cart ? JSON.parse(cart) : { items: [] };
  } catch (error) {
    console.error("Error getting cart from localStorage:", error);
    return { items: [] };
  }
};

export const addToCart = async (product: Product, quantity: number = 1): Promise<CartState> => {
  await delay(100);
  try {
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
    
    // Save updated cart to localStorage
    localStorage.setItem("cart", JSON.stringify(cart));
    
    // Return updated cart
    return cart;
  } catch (error) {
    console.error("Error adding to cart:", error);
    throw error;
  }
};

export const removeFromCart = async (productId: number): Promise<CartState> => {
  await delay(100);
  try {
    // Get current cart
    let cart = await getCart();
    
    // Remove product from cart
    cart.items = cart.items.filter(item => item.id !== productId);
    
    // Save updated cart to localStorage
    localStorage.setItem("cart", JSON.stringify(cart));
    
    // Return updated cart
    return cart;
  } catch (error) {
    console.error("Error removing from cart:", error);
    throw error;
  }
};

export const updateCartItemQuantity = async (productId: number, quantity: number): Promise<CartState> => {
  await delay(100);
  try {
    // Get current cart
    let cart = await getCart();
    
    // Find item
    const item = cart.items.find(item => item.id === productId);
    
    if (item) {
      // Update quantity
      item.quantity = Math.max(1, quantity);
    }
    
    // Save updated cart to localStorage
    localStorage.setItem("cart", JSON.stringify(cart));
    
    // Return updated cart
    return cart;
  } catch (error) {
    console.error("Error updating cart item quantity:", error);
    throw error;
  }
};
