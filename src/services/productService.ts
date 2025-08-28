import { supabase } from '@/integrations/supabase/client';
import { Product } from '../shared/interfaces/Iproduct.interface';

export class ProductService {
  static async getAllProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('id');

    if (error) {
      console.error('Error fetching products:', error);
      throw error;
    }

    return data || [];
  }

  static async getProductById(id: number): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No rows returned
      }
      console.error('Error fetching product:', error);
      throw error;
    }

    return data;
  }

  static async getProductsByCategory(category: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('category', category)
      .eq('is_active', true)
      .order('id');

    if (error) {
      console.error('Error fetching products by category:', error);
      throw error;
    }

    return data || [];
  }

  static async getFeaturedProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_featured', true)
      .eq('is_active', true)
      .order('id');

    if (error) {
      console.error('Error fetching featured products:', error);
      throw error;
    }

    return data || [];
  }

  static async getNewProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_new', true)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching new products:', error);
      throw error;
    }

    return data || [];
  }

  static async searchProducts(query: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .or(`name.ilike.%${query}%, description.ilike.%${query}%, category.ilike.%${query}%`)
      .eq('is_active', true)
      .order('id');

    if (error) {
      console.error('Error searching products:', error);
      throw error;
    }

    return data || [];
  }
}