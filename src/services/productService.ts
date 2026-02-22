/**
 * Product Service
 * Centralized product data access with consistent error handling
 */

import { supabase } from '@/integrations/supabase/client';
import {
  Product,
  normalizeProducts,
  normalizeProduct,
} from '../shared/interfaces/Iproduct.interface';
import {
  DatabaseError,
  NotFoundError,
  handleError,
} from '@/lib/errors/AppError';

export class ProductService {
  private static readonly TABLE = 'products';

  /**
   * Fetch all active products
   */
  static async getAllProducts(): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE)
        .select('*')
        .eq('is_active', true)
        .order('id');

      if (error) {
        throw new DatabaseError(
          `Failed to fetch products: ${error.message}`,
          error.code
        );
      }

      return normalizeProducts(data || []);
    } catch (error) {
      handleError(error, 'ProductService.getAllProducts');
      throw error;
    }
  }

  /**
   * Fetch a single product by ID
   */
  static async getProductById(id: number): Promise<Product | null> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE)
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No rows returned
        }
        throw new DatabaseError(
          `Failed to fetch product ${id}: ${error.message}`,
          error.code
        );
      }

      return data ? normalizeProduct(data) : null;
    } catch (error) {
      if (error instanceof NotFoundError) {
        return null;
      }
      handleError(error, 'ProductService.getProductById');
      throw error;
    }
  }

  /**
   * Fetch products by category
   */
  static async getProductsByCategory(category: string): Promise<Product[]> {
    try {
      if (!category || typeof category !== 'string') {
        throw new Error('Invalid category provided');
      }

      const { data, error } = await supabase
        .from(this.TABLE)
        .select('*')
        .eq('category', category)
        .eq('is_active', true)
        .order('id');

      if (error) {
        throw new DatabaseError(
          `Failed to fetch products for category ${category}: ${error.message}`,
          error.code
        );
      }

      return normalizeProducts(data || []);
    } catch (error) {
      handleError(error, 'ProductService.getProductsByCategory');
      throw error;
    }
  }

  /**
   * Fetch featured products
   */
  static async getFeaturedProducts(): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE)
        .select('*')
        .eq('is_featured', true)
        .eq('is_active', true)
        .order('id');

      if (error) {
        throw new DatabaseError(
          `Failed to fetch featured products: ${error.message}`,
          error.code
        );
      }

      return normalizeProducts(data || []);
    } catch (error) {
      handleError(error, 'ProductService.getFeaturedProducts');
      throw error;
    }
  }

  /**
   * Fetch new products
   */
  static async getNewProducts(): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE)
        .select('*')
        .eq('is_new', true)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw new DatabaseError(
          `Failed to fetch new products: ${error.message}`,
          error.code
        );
      }

      return normalizeProducts(data || []);
    } catch (error) {
      handleError(error, 'ProductService.getNewProducts');
      throw error;
    }
  }

  /**
   * Search products by query
   */
  static async searchProducts(query: string): Promise<Product[]> {
    try {
      if (!query || typeof query !== 'string') {
        return [];
      }

      // Sanitize the query to prevent injection
      const sanitizedQuery = query.trim().replace(/[%_]/g, '\\$&');

      if (sanitizedQuery.length < 2) {
        return [];
      }

      const { data, error } = await supabase
        .from(this.TABLE)
        .select('*')
        .or(
          `name.ilike.%${sanitizedQuery}%,description.ilike.%${sanitizedQuery}%,category.ilike.%${sanitizedQuery}%`
        )
        .eq('is_active', true)
        .order('id');

      if (error) {
        throw new DatabaseError(
          `Failed to search products: ${error.message}`,
          error.code
        );
      }

      return normalizeProducts(data || []);
    } catch (error) {
      handleError(error, 'ProductService.searchProducts');
      throw error;
    }
  }

  /**
   * Get product stock information
   */
  static async getProductStock(
    id: number
  ): Promise<{ stock: number; lowStockThreshold: number } | null> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE)
        .select('stock_quantity, min_stock_level')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new DatabaseError(
          `Failed to fetch stock for product ${id}: ${error.message}`,
          error.code
        );
      }

      return data
        ? {
            stock: data.stock_quantity ?? 0,
            lowStockThreshold: data.min_stock_level ?? 5,
          }
        : null;
    } catch (error) {
      handleError(error, 'ProductService.getProductStock');
      throw error;
    }
  }
}
