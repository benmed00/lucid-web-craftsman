import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/shared/interfaces/Iproduct.interface";

export interface StockInfo {
  available: number;
  isLow: boolean;
  isOutOfStock: boolean;
  message?: string;
  canOrder: boolean;
  maxQuantity: number;
}

export interface StockUpdate {
  productId: number;
  quantity: number;
  type: 'add' | 'remove' | 'set';
  reason?: string;
}

export class StockService {
  private static instance: StockService;

  static getInstance(): StockService {
    if (!StockService.instance) {
      StockService.instance = new StockService();
    }
    return StockService.instance;
  }

  /**
   * Get stock information for a product
   */
  async getStockInfo(productId: number): Promise<StockInfo | null> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('stock_quantity, min_stock_level, is_available')
        .eq('id', productId)
        .single();

      if (error) throw error;
      if (!data) return null;

      const available = data.stock_quantity || 0;
      const minStock = data.min_stock_level || 3;
      const isAvailable = data.is_available !== false;

      return this.calculateStockInfo(available, minStock, isAvailable);

    } catch (error) {
      console.error('Error fetching stock info:', error);
      return null;
    }
  }

  /**
   * Get stock information for multiple products
   */
  async getMultipleStockInfo(productIds: number[]): Promise<Record<number, StockInfo>> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, stock_quantity, min_stock_level, is_available')
        .in('id', productIds);

      if (error) throw error;

      const stockInfo: Record<number, StockInfo> = {};
      
      for (const product of data || []) {
        const available = product.stock_quantity || 0;
        const minStock = product.min_stock_level || 3;
        const isAvailable = product.is_available !== false;
        
        stockInfo[product.id] = this.calculateStockInfo(available, minStock, isAvailable);
      }

      return stockInfo;

    } catch (error) {
      console.error('Error fetching multiple stock info:', error);
      return {};
    }
  }

  /**
   * Check if quantity can be ordered
   */
  async canOrderQuantity(productId: number, quantity: number): Promise<{ canOrder: boolean; reason?: string }> {
    const stockInfo = await this.getStockInfo(productId);
    
    if (!stockInfo) {
      return { canOrder: false, reason: 'Produit non trouvé' };
    }

    if (!stockInfo.canOrder) {
      return { canOrder: false, reason: 'Produit indisponible' };
    }

    if (quantity > stockInfo.maxQuantity) {
      return { 
        canOrder: false, 
        reason: `Stock insuffisant (${stockInfo.available} disponible${stockInfo.available > 1 ? 's' : ''})`
      };
    }

    return { canOrder: true };
  }

  /**
   * Reserve stock for a cart/order
   */
  async reserveStock(items: Array<{ productId: number; quantity: number }>): Promise<{
    success: boolean;
    errors?: Array<{ productId: number; error: string }>;
  }> {
    const errors: Array<{ productId: number; error: string }> = [];

    for (const item of items) {
      const canOrder = await this.canOrderQuantity(item.productId, item.quantity);
      if (!canOrder.canOrder) {
        errors.push({
          productId: item.productId,
          error: canOrder.reason || 'Impossible de commander cette quantité'
        });
      }
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    // In a real app, we would actually reserve the stock here
    // For now, we just validate that it's possible
    return { success: true };
  }

  /**
   * Deduct stock after successful payment
   */
  async deductStock(items: Array<{ productId: number; quantity: number }>): Promise<{
    success: boolean;
    errors?: Array<{ productId: number; error: string }>;
    stockUpdates?: Array<{ productId: number; previousStock: number; newStock: number; quantitySold: number }>;
  }> {
    const errors: Array<{ productId: number; error: string }> = [];
    const stockUpdates: Array<{ productId: number; previousStock: number; newStock: number; quantitySold: number }> = [];

    for (const item of items) {
      try {
        const { data: product, error: fetchError } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', item.productId)
          .single();

        if (fetchError) {
          errors.push({
            productId: item.productId,
            error: `Erreur lors de la récupération du stock: ${fetchError.message}`
          });
          continue;
        }

        const currentStock = product.stock_quantity || 0;
        const newStock = Math.max(0, currentStock - item.quantity);

        const { error: updateError } = await supabase
          .from('products')
          .update({ 
            stock_quantity: newStock,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.productId);

        if (updateError) {
          errors.push({
            productId: item.productId,
            error: `Erreur lors de la mise à jour du stock: ${updateError.message}`
          });
        } else {
          stockUpdates.push({
            productId: item.productId,
            previousStock: currentStock,
            newStock: newStock,
            quantitySold: item.quantity
          });
        }
      } catch (error) {
        errors.push({
          productId: item.productId,
          error: `Erreur inattendue: ${error instanceof Error ? error.message : String(error)}`
        });
      }
    }

    if (errors.length > 0) {
      return { success: false, errors, stockUpdates };
    }

    return { success: true, stockUpdates };
  }

  /**
   * Update stock quantity (for admin use)
   */
  async updateStock(update: StockUpdate): Promise<void> {
    try {
      const { data: currentProduct, error: fetchError } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', update.productId)
        .single();

      if (fetchError) throw fetchError;

      let newQuantity: number;
      const current = currentProduct.stock_quantity || 0;

      switch (update.type) {
        case 'add':
          newQuantity = current + update.quantity;
          break;
        case 'remove':
          newQuantity = Math.max(0, current - update.quantity);
          break;
        case 'set':
          newQuantity = update.quantity;
          break;
        default:
          throw new Error('Invalid update type');
      }

      const { error: updateError } = await supabase
        .from('products')
        .update({ stock_quantity: newQuantity })
        .eq('id', update.productId);

      if (updateError) throw updateError;

    } catch (error) {
      console.error('Error updating stock:', error);
      throw error;
    }
  }

  /**
   * Get low stock products (for admin alerts)
   */
  async getLowStockProducts(): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .or('stock_quantity.lte.min_stock_level,stock_quantity.eq.0')
        .eq('is_active', true)
        .order('stock_quantity');

      if (error) throw error;

      return data?.map(product => ({
        ...product,
        new: product.is_new,
        artisanStory: product.artisan_story,
        related: product.related_products
      })) || [];

    } catch (error) {
      console.error('Error fetching low stock products:', error);
      return [];
    }
  }

  /**
   * Calculate stock information from raw values
   */
  private calculateStockInfo(available: number, minStock: number, isAvailable: boolean): StockInfo {
    const isOutOfStock = available <= 0 || !isAvailable;
    const isLow = available > 0 && available <= minStock && isAvailable;
    const canOrder = available > 0 && isAvailable;

    let message: string | undefined;

    if (isOutOfStock) {
      message = isAvailable ? 'Rupture de stock' : 'Produit indisponible';
    } else if (isLow) {
      message = `Il ne reste que ${available} pièce${available > 1 ? 's' : ''}`;
    }

    return {
      available,
      isLow,
      isOutOfStock,
      message,
      canOrder,
      maxQuantity: canOrder ? available : 0
    };
  }
}

// Export singleton instance
export const stockService = StockService.getInstance();