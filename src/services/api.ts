// src/services/api.ts
// Centralized API service using the unified API client

import { apiClient, fetchWithRetry } from '@/lib/api/apiClient';
import { handleError } from '@/lib/errors/AppError';

// Product types
interface Product {
  id: number;
  name: string;
  price: number;
  description: string;
  images: string[];
  category: string;
  artisan: string;
  care: string;
  details: string;
  is_active?: boolean;
  stock_quantity?: number;
}

interface ProductsResponse {
  products?: Product[];
  /** Backend mock API returns paginated results under `items` */
  items?: Product[];
  total?: number;
}

/**
 * Fetch all products from the API
 */
export const fetchProducts = async (): Promise<Product[]> => {
  try {
    const response = await apiClient.get<ProductsResponse | Product[]>('/api/products');
    
    // Handle both array and object responses
    if (Array.isArray(response)) {
      return response;
    }
    
    return response.products ?? response.items ?? [];
  } catch (error) {
    const appError = handleError(error);
    console.error('Failed to fetch products:', appError.message);
    throw appError;
  }
};

/**
 * Fetch a single product by ID
 */
export const fetchProductById = async (id: number): Promise<Product | null> => {
  try {
    return await apiClient.get<Product>(`/api/products/${id}`);
  } catch (error) {
    const appError = handleError(error);
    console.error(`Failed to fetch product ${id}:`, appError.message);
    return null;
  }
};

/**
 * Fetch products by category
 */
export const fetchProductsByCategory = async (category: string): Promise<Product[]> => {
  try {
    const response = await apiClient.get<ProductsResponse | Product[]>(
      `/api/products?category=${encodeURIComponent(category)}`
    );
    
    if (Array.isArray(response)) {
      return response;
    }
    
    return response.products ?? response.items ?? [];
  } catch (error) {
    const appError = handleError(error);
    console.error(`Failed to fetch products for category ${category}:`, appError.message);
    return [];
  }
};

/**
 * Search products
 */
export const searchProducts = async (query: string): Promise<Product[]> => {
  try {
    const response = await apiClient.get<ProductsResponse | Product[]>(
      `/api/products?search=${encodeURIComponent(query)}`
    );
    
    if (Array.isArray(response)) {
      return response;
    }
    
    return response.products ?? response.items ?? [];
  } catch (error) {
    const appError = handleError(error);
    console.error(`Failed to search products for "${query}":`, appError.message);
    return [];
  }
};

// Export for backward compatibility
export { apiClient, fetchWithRetry };
