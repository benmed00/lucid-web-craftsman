// import axios from "axios"; // Marked as unused

import { supabase } from '@/integrations/supabase/client';
import {
  Product,
  normalizeProduct,
  normalizeProducts,
} from '../shared/interfaces/Iproduct.interface';
// Helper to simulate API latency
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Commented out unused axios instance
// import { AxiosInstance } from "axios"; // Import was also removed earlier
// const api: AxiosInstance = axios.create({
//   baseURL: "https://api.example.com",
//   headers: {
//     "Content-Type": "application/json",
//   },
// });

// Blog posts API - using Supabase
// Fallback to static data if DB is empty
import { blogPosts as staticBlogPosts } from '../data/blogPosts';

export interface BlogPostDB {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image_url: string | null;
  author_id: string | null;
  status: string | null;
  is_featured: boolean | null;
  tags: string[] | null;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  view_count: number | null;
  created_at: string | null;
  updated_at: string | null;
}

// Legacy interface for backward compatibility
export interface BlogPostLegacy {
  id: number;
  title: string;
  excerpt: string;
  image: string;
  date: string;
  author: string;
  category: string;
  featured?: boolean;
  // Extended fields from DB
  slug?: string;
  content?: string;
  tags?: string[];
}

// Convert DB format to legacy format for backward compatibility
const convertDBToLegacy = (dbPost: BlogPostDB): BlogPostLegacy => {
  const publishedDate = dbPost.published_at
    ? new Date(dbPost.published_at).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Date inconnue';

  return {
    id:
      parseInt(dbPost.slug.split('-').pop() || '0') ||
      Math.abs(dbPost.id.charCodeAt(0)), // Generate a numeric ID from slug or uuid
    title: dbPost.title,
    excerpt: dbPost.excerpt || '',
    image: dbPost.featured_image_url || '/placeholder.svg',
    date: publishedDate,
    author: 'Rif Raw Straw', // Default author since we don't have author table joined
    category: dbPost.tags?.[0] || 'Artisanat',
    featured: dbPost.is_featured || false,
    slug: dbPost.slug,
    content: dbPost.content,
    tags: dbPost.tags || [],
  };
};

export const getBlogPosts = async (): Promise<BlogPostLegacy[]> => {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    if (error) {
      console.error('Error fetching blog posts from DB:', error);
      // Fallback to static data
      return staticBlogPosts;
    }

    if (!data || data.length === 0) {
      // Fallback to static data if DB is empty
      return staticBlogPosts;
    }

    return data.map(convertDBToLegacy);
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return staticBlogPosts;
  }
};

export const getBlogPostById = async (
  id: number
): Promise<BlogPostLegacy | null> => {
  try {
    // First try to fetch from DB
    const { data: allPosts, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    if (error || !allPosts || allPosts.length === 0) {
      // Fallback to static data
      const post = staticBlogPosts.find((post) => post.id === id);
      return post || null;
    }

    // Find the post by index (id is 1-based)
    const post = allPosts[id - 1];
    if (!post) {
      // Fallback to static data
      const staticPost = staticBlogPosts.find((p) => p.id === id);
      return staticPost || null;
    }

    return convertDBToLegacy(post);
  } catch (error) {
    console.error(`Post with ID ${id} not found`, error);
    // Fallback to static data
    const post = staticBlogPosts.find((post) => post.id === id);
    return post || null;
  }
};

export const getBlogPostBySlug = async (
  slug: string
): Promise<BlogPostLegacy | null> => {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (error || !data) {
      console.error(`Post with slug ${slug} not found`, error);
      return null;
    }

    return convertDBToLegacy(data);
  } catch (error) {
    console.error(`Post with slug ${slug} not found`, error);
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
      console.error('Error fetching products:', error);
      throw error;
    }

    // Use centralized normalizer for consistency
    return normalizeProducts(data || []);
  } catch (error) {
    console.error('Error fetching products:', error);
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

    // Use centralized normalizer for consistency
    return data ? normalizeProduct(data) : null;
  } catch (error) {
    console.error(`Product with ID ${id} not found`, error);
    return null;
  }
};

// Cart API - Simulating backend calls, no localStorage interaction here.
// Actual cart state is managed by CartContext.

export interface CartItem {
  // This interface might still be useful for type definitions
  id: number;
  quantity: number;
  product: Product;
}

export interface CartState {
  // This interface might still be useful for type definitions
  items: CartItem[];
  // totalPrice might be part of a real API response, but not strictly needed for mock here
}

// Simulates fetching the cart structure, not actual items from localStorage
export const getCart = async (): Promise<{
  success: boolean;
  cart?: CartState;
}> => {
  await delay(100);
  // console.log("mockApiService: getCart called (simulated)");
  // In a real scenario, this might fetch user's cart from backend.
  // For this refactor, components will rely on CartContext for actual data after initial load.
  // This function becomes less critical if CartContext is the source of truth post-hydration.
  return { success: true, cart: { items: [] } }; // Simulate a successful call, empty cart
};

// Simulates adding an item to the cart via an API call
export const addToCart = async (
  product: Product,
  quantity: number = 1
): Promise<{ success: boolean; item?: CartItem }> => {
  await delay(100);
  // console.log(`mockApiService: addToCart called for product ${product.id}, quantity ${quantity} (simulated)`);
  // Simulate a successful API response
  // The actual state update will be handled by dispatching to CartContext in the component
  return { success: true, item: { id: product.id, product, quantity } };
};

// Simulates removing an item from the cart via an API call
export const removeFromCart = async (
  productId: number
): Promise<{ success: boolean; productId?: number }> => {
  await delay(100);
  // console.log(`mockApiService: removeFromCart called for product ${productId} (simulated)`);
  // Simulate a successful API response
  return { success: true, productId };
};

// Simulates updating an item's quantity in the cart via an API call
export const updateCartItemQuantity = async (
  productId: number,
  quantity: number
): Promise<{ success: boolean; item?: { id: number; quantity: number } }> => {
  await delay(100);
  // console.log(`mockApiService: updateCartItemQuantity called for product ${productId}, quantity ${quantity} (simulated)`);
  if (quantity <= 0) {
    // Typically, an API might handle quantity <= 0 as a remove operation or error
    // For this mock, let's assume it can also be handled as a removal or just a success for update.
    // The reducer will handle the removal if quantity is 0.
    // console.log(`mockApiService: quantity for product ${productId} is <= 0, will be handled by reducer as removal if needed.`);
  }
  // Simulate a successful API response
  return { success: true, item: { id: productId, quantity } };
};

// Simulates clearing the cart via an API call
export const clearCart = async (): Promise<{ success: boolean }> => {
  await delay(100);
  // console.log("mockApiService: clearCart called (simulated)");
  // Simulate a successful API response
  return { success: true };
};
