// src/context/CartContext.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React, { ReactNode } from 'react';

// Mock dependencies before importing CartContext
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
  },
}));

vi.mock('@/services/productService', () => ({
  ProductService: {
    getProductById: vi.fn().mockResolvedValue({
      id: 1,
      name: 'Test Product',
      price: 100,
      images: [],
      category: 'test',
      description: 'Test description',
      details: 'Test details',
      care: 'Test care',
      artisan: 'Test artisan',
    }),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

import { CartProvider, useCart, CartItem, CartState, CartAction } from './CartContext';
import { Product } from '@/shared/interfaces/Iproduct.interface';

// Helper to wait for async state updates
const waitForCondition = async (
  condition: () => boolean, 
  timeout = 1000,
  interval = 50
): Promise<void> => {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error('Condition not met within timeout');
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <CartProvider>{children}</CartProvider>
);

// Mock product for tests
const mockProduct: Product = {
  id: 1,
  name: 'Chapeau de Paille',
  price: 45,
  images: ['/test.jpg'],
  category: 'chapeaux',
  description: 'Un beau chapeau',
  details: 'Détails du chapeau',
  care: 'Entretien du chapeau',
  artisan: 'Artisan Test',
};

const mockProduct2: Product = {
  id: 2,
  name: 'Sac Tressé',
  price: 80,
  images: ['/sac.jpg'],
  category: 'sacs',
  description: 'Un beau sac',
  details: 'Détails du sac',
  care: 'Entretien du sac',
  artisan: 'Artisan Test 2',
};

describe('CartProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should provide initial empty cart', async () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    
    expect(result.current.cart.items).toEqual([]);
    expect(result.current.itemCount).toBe(0);
    expect(result.current.totalPrice).toBe(0);
  });

  it('should throw error when useCart is used outside provider', () => {
    expect(() => {
      renderHook(() => useCart());
    }).toThrow('useCart must be used within a CartProvider');
  });
});

describe('Cart operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('addItem', () => {
    it('should add a new item to cart', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      
      act(() => {
        result.current.addItem(mockProduct, 1);
      });
      
      expect(result.current.cart.items).toHaveLength(1);
      expect(result.current.cart.items[0].id).toBe(mockProduct.id);
      expect(result.current.cart.items[0].quantity).toBe(1);
      expect(result.current.cart.items[0].product).toEqual(mockProduct);
    });

    it('should increase quantity when adding existing item', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      
      act(() => {
        result.current.addItem(mockProduct, 1);
        result.current.addItem(mockProduct, 2);
      });
      
      expect(result.current.cart.items).toHaveLength(1);
      expect(result.current.cart.items[0].quantity).toBe(3);
    });

    it('should add different products separately', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      
      act(() => {
        result.current.addItem(mockProduct, 1);
        result.current.addItem(mockProduct2, 2);
      });
      
      expect(result.current.cart.items).toHaveLength(2);
      expect(result.current.cart.items[0].id).toBe(mockProduct.id);
      expect(result.current.cart.items[1].id).toBe(mockProduct2.id);
    });
  });

  describe('removeItem', () => {
    it('should remove an item from cart', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      
      act(() => {
        result.current.addItem(mockProduct, 1);
        result.current.addItem(mockProduct2, 1);
      });
      
      expect(result.current.cart.items).toHaveLength(2);
      
      act(() => {
        result.current.removeItem(mockProduct.id);
      });
      
      expect(result.current.cart.items).toHaveLength(1);
      expect(result.current.cart.items[0].id).toBe(mockProduct2.id);
    });

    it('should do nothing when removing non-existent item', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      
      act(() => {
        result.current.addItem(mockProduct, 1);
      });
      
      act(() => {
        result.current.removeItem(999);
      });
      
      expect(result.current.cart.items).toHaveLength(1);
    });
  });

  describe('updateItemQuantity', () => {
    it('should update item quantity', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      
      act(() => {
        result.current.addItem(mockProduct, 1);
      });
      
      act(() => {
        result.current.updateItemQuantity(mockProduct.id, 5);
      });
      
      expect(result.current.cart.items[0].quantity).toBe(5);
    });

    it('should remove item when quantity is set to 0', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      
      act(() => {
        result.current.addItem(mockProduct, 2);
      });
      
      act(() => {
        result.current.updateItemQuantity(mockProduct.id, 0);
      });
      
      expect(result.current.cart.items).toHaveLength(0);
    });
  });

  describe('clearCart', () => {
    it('should remove all items from cart', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      
      act(() => {
        result.current.addItem(mockProduct, 1);
        result.current.addItem(mockProduct2, 2);
      });
      
      expect(result.current.cart.items).toHaveLength(2);
      
      act(() => {
        result.current.clearCart();
      });
      
      expect(result.current.cart.items).toHaveLength(0);
      expect(result.current.itemCount).toBe(0);
    });
  });
});

describe('Cart calculations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('itemCount', () => {
    it('should calculate total item count correctly', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      
      act(() => {
        result.current.addItem(mockProduct, 3);
        result.current.addItem(mockProduct2, 2);
      });
      
      expect(result.current.itemCount).toBe(5);
    });
  });

  describe('totalPrice', () => {
    it('should calculate total price correctly', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      
      act(() => {
        result.current.addItem(mockProduct, 2); // 45 * 2 = 90
        result.current.addItem(mockProduct2, 1); // 80 * 1 = 80
      });
      
      expect(result.current.totalPrice).toBe(170);
    });
  });
});

describe('Cart state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should expose isOnline status', async () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    
    // navigator.onLine is true by default in jsdom
    expect(result.current.isOnline).toBe(true);
  });

  it('should expose pendingOperations count', async () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    
    expect(result.current.pendingOperations).toBe(0);
  });

  it('should expose isSyncing status', async () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    
    expect(result.current.isSyncing).toBe(false);
  });
});
