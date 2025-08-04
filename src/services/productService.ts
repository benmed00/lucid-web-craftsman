import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/shared/interfaces/Iproduct.interface";

export interface CreateProductData {
  name: string;
  price: number;
  images: string[];
  category: string;
  description: string;
  details: string;
  care: string;
  is_new?: boolean;
  artisan: string;
  artisan_story?: string;
  related_products?: number[];
}

export interface UpdateProductData extends Partial<CreateProductData> {
  id: number;
}

// Admin product management service
export const productService = {
  // Create new product
  async createProduct(productData: CreateProductData): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .insert([productData])
      .select()
      .single();

    if (error) {
      console.error("Error creating product:", error);
      throw error;
    }

    // Transform database fields to match interface
    return {
      ...data,
      new: data.is_new,
      artisanStory: data.artisan_story,
      related: data.related_products
    };
  },

  // Update existing product
  async updateProduct(productData: UpdateProductData): Promise<Product> {
    const { id, ...updateData } = productData;
    
    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error("Error updating product:", error);
      throw error;
    }

    // Transform database fields to match interface
    return {
      ...data,
      new: data.is_new,
      artisanStory: data.artisan_story,
      related: data.related_products
    };
  },

  // Delete product
  async deleteProduct(id: number): Promise<void> {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Error deleting product:", error);
      throw error;
    }
  },

  // Toggle new status
  async toggleNewStatus(id: number): Promise<Product> {
    // First get current status
    const { data: currentProduct, error: fetchError } = await supabase
      .from('products')
      .select('is_new')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error("Error fetching product:", fetchError);
      throw fetchError;
    }

    // Toggle the status
    const { data, error } = await supabase
      .from('products')
      .update({ is_new: !currentProduct.is_new })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error("Error toggling new status:", error);
      throw error;
    }

    // Transform database fields to match interface
    return {
      ...data,
      new: data.is_new,
      artisanStory: data.artisan_story,
      related: data.related_products
    };
  },

  // Get product categories
  async getCategories(): Promise<string[]> {
    const { data, error } = await supabase
      .from('products')
      .select('category')
      .order('category');

    if (error) {
      console.error("Error fetching categories:", error);
      throw error;
    }

    // Get unique categories
    const uniqueCategories = [...new Set(data.map(item => item.category))];
    return uniqueCategories;
  },

  // Search products
  async searchProducts(query: string, category?: string): Promise<Product[]> {
    let queryBuilder = supabase
      .from('products')
      .select('*');

    // Add text search
    if (query) {
      queryBuilder = queryBuilder.or(`name.ilike.%${query}%,description.ilike.%${query}%,artisan.ilike.%${query}%`);
    }

    // Add category filter
    if (category && category !== 'all') {
      queryBuilder = queryBuilder.eq('category', category);
    }

    queryBuilder = queryBuilder.order('created_at', { ascending: false });

    const { data, error } = await queryBuilder;

    if (error) {
      console.error("Error searching products:", error);
      throw error;
    }

    // Transform database fields to match interface
    return data?.map(product => ({
      ...product,
      new: product.is_new,
      artisanStory: product.artisan_story,
      related: product.related_products
    })) || [];
  }
};