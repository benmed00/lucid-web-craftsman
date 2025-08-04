import { supabase } from "@/integrations/supabase/client";
import { Product } from "../shared/interfaces/Iproduct.interface";

// Helper to simulate API latency
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Blog posts API - using in-memory data
export const getBlogPosts = async () => {
  try {
    await delay(300); // Simulate network latency
    // Get blog posts from blogPosts data
    const response = await import("../data/blogPosts");
    return response.blogPosts;
  } catch (error) {
    console.error("Error fetching blog posts:", error);
    throw error;
  }
};

export const getBlogPostById = async (id: number) => {
  try {
    await delay(200);
    const response = await import("../data/blogPosts");
    const post = response.blogPosts.find(post => post.id === id);
    return post || null;
  } catch (error) {
    console.error(`Post with ID ${id} not found`, error);
    return null;
  }
};

// Products API - using Supabase
export const getProducts = async (): Promise<Product[]> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching products:", error);
      throw error;
    }

    // Transform database fields to match interface
    return data?.map(product => ({
      ...product,
      new: product.is_new,
      artisanStory: product.artisan_story,
      related: product.related_products
    })) || [];
  } catch (error) {
    console.error("Error fetching products:", error);
    throw error;
  }
};

export const getProductById = async (id: number): Promise<Product | null> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Product with ID ${id} not found`, error);
      return null;
    }

    // Transform database fields to match interface
    return data ? {
      ...data,
      new: data.is_new,
      artisanStory: data.artisan_story,
      related: data.related_products
    } : null;
  } catch (error) {
    console.error(`Product with ID ${id} not found`, error);
    return null;
  }
};

// Cart API - using Supabase for authenticated users, localStorage for guests
export interface CartItem {
  id: number;
  quantity: number;
  product: Product;
}

export interface CartState {
  items: CartItem[];
}

// Helper to check if user is authenticated
const isAuthenticated = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session?.user;
};

// Get cart items from localStorage (for guest users)
const getLocalStorageCart = (): CartState => {
  try {
    const cart = localStorage.getItem("cart");
    return cart ? JSON.parse(cart) : { items: [] };
  } catch (error) {
    console.error("Error getting cart from localStorage:", error);
    return { items: [] };
  }
};

// Save cart to localStorage (for guest users)
const saveLocalStorageCart = (cart: CartState) => {
  localStorage.setItem("cart", JSON.stringify(cart));
};

// Get cart items from Supabase (for authenticated users)
const getSupabaseCart = async (): Promise<CartState> => {
  try {
    const { data, error } = await supabase
      .from('cart_items')
      .select(`
        id,
        product_id,
        quantity,
        products (*)
      `)
      .order('created_at', { ascending: true });

    if (error) {
      console.error("Error fetching cart from Supabase:", error);
      return { items: [] };
    }

    const items: CartItem[] = data?.map(item => ({
      id: item.product_id,
      quantity: item.quantity,
      product: {
        ...item.products,
        new: item.products.is_new,
        artisanStory: item.products.artisan_story,
        related: item.products.related_products
      }
    })) || [];

    return { items };
  } catch (error) {
    console.error("Error fetching cart from Supabase:", error);
    return { items: [] };
  }
};

export const getCart = async (): Promise<CartState> => {
  await delay(100);

  if (await isAuthenticated()) {
    return getSupabaseCart();
  } else {
    return getLocalStorageCart();
  }
};

export const addToCart = async (product: Product, quantity: number = 1): Promise<CartState> => {
  await delay(100);

  if (await isAuthenticated()) {
    try {
      // Try to update existing item first
      const { data: existingItem } = await supabase
        .from('cart_items')
        .select('quantity')
        .eq('product_id', product.id)
        .single();

      if (existingItem) {
        // Update existing item
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity: existingItem.quantity + quantity })
          .eq('product_id', product.id);

        if (error) throw error;
      } else {
        // Insert new item
        const { error } = await supabase
          .from('cart_items')
          .insert({
            product_id: product.id,
            quantity: quantity,
            user_id: (await supabase.auth.getUser()).data.user?.id
          });

        if (error) throw error;
      }

      return getSupabaseCart();
    } catch (error) {
      console.error("Error adding to cart in Supabase:", error);
      // Fallback to localStorage
      return addToLocalStorageCart(product, quantity);
    }
  } else {
    return addToLocalStorageCart(product, quantity);
  }
};

// Helper for localStorage cart operations
const addToLocalStorageCart = async (product: Product, quantity: number): Promise<CartState> => {
  const cart = getLocalStorageCart();
  const existingItem = cart.items.find(item => item.id === product.id);

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.items.push({
      id: product.id,
      quantity,
      product
    });
  }

  saveLocalStorageCart(cart);
  return cart;
};

export const removeFromCart = async (productId: number): Promise<CartState> => {
  await delay(100);

  if (await isAuthenticated()) {
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('product_id', productId);

      if (error) throw error;
      return getSupabaseCart();
    } catch (error) {
      console.error("Error removing from cart in Supabase:", error);
      // Fallback to localStorage
      return removeFromLocalStorageCart(productId);
    }
  } else {
    return removeFromLocalStorageCart(productId);
  }
};

// Helper for localStorage cart operations
const removeFromLocalStorageCart = async (productId: number): Promise<CartState> => {
  const cart = getLocalStorageCart();
  cart.items = cart.items.filter(item => item.id !== productId);
  saveLocalStorageCart(cart);
  return cart;
};

export const updateCartItemQuantity = async (productId: number, quantity: number): Promise<CartState> => {
  await delay(100);

  if (await isAuthenticated()) {
    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: Math.max(1, quantity) })
        .eq('product_id', productId);

      if (error) throw error;
      return getSupabaseCart();
    } catch (error) {
      console.error("Error updating cart quantity in Supabase:", error);
      // Fallback to localStorage
      return updateLocalStorageCartQuantity(productId, quantity);
    }
  } else {
    return updateLocalStorageCartQuantity(productId, quantity);
  }
};

// Helper for localStorage cart operations
const updateLocalStorageCartQuantity = async (productId: number, quantity: number): Promise<CartState> => {
  const cart = getLocalStorageCart();
  const item = cart.items.find(item => item.id === productId);

  if (item) {
    item.quantity = Math.max(1, quantity);
  }

  saveLocalStorageCart(cart);
  return cart;
};
