// File_name : src/utils/analyticsUtils.ts 
   
import { Product, ProductCategory } from '../types/productTypes';
import { BlogPost, BlogCategory } from '../types/blogTypes';
import { Cart, CartItem } from '../types/cartTypes';
import { User } from '../types/userTypes';
import { CartTotals } from './currencyUtils';

export interface AnalyticsEvent {
  category: string;
  action: string;
  label?: string;
  value?: number;
  timestamp: number;
  userId?: string;
  properties?: Record<string, any>;
}

export interface ProductAnalytics {
  productId: string;
  views: number;
  clicks: number;
  addToCart: number;
  purchases: number;
  revenue: number;
  averagePrice: number;
  conversionRate: number;
}

export interface UserAnalytics {
  userId: string;
  sessions: number;
  pageViews: number;
  timeOnSite: number;
  cartAbandonmentRate: number;
  purchaseRate: number;
  averageOrderValue: number;
  totalPurchases: number;
  totalRevenue: number;
}

export interface CartAnalytics {
  cartId: string;
  totalItems: number;
  totalValue: number;
  averageCartValue: number;
  conversionRate: number;
  abandonRate: number;
  mostAddedProducts: string[];
  mostRemovedProducts: string[];
  totals: {
    subtotal: number;
    tax: number;
    shipping: number;
    discount: number;
    total: number;
  };
}

export interface BlogAnalytics {
  postId: string;
  views: number;
  readTime: number;
  shares: number;
  comments: number;
  conversionRate: number;
}

export const trackEvent = (event: AnalyticsEvent): void => {
  try {
    // Implementation will depend on the analytics service being used
    console.log('Analytics event:', event);
  } catch (error) {
    console.error('Failed to track event:', error);
  }
};

export const trackPageView = (page: string, userId?: string): void => {
  trackEvent({
    category: 'Page View',
    action: 'view',
    label: page,
    timestamp: Date.now(),
    userId
  });
};

export const trackProductView = (product: Product, userId?: string): void => {
  trackEvent({
    category: 'Product',
    action: 'view',
    label: product.name,
    value: product.price,
    timestamp: Date.now(),
    userId,
    properties: {
      productId: product.id,
      category: product.category,
      price: product.price,
      rating: product.rating,
      reviews: product.reviewsCount
    }
  });
};

export const trackAddToCart = (item: CartItem, userId?: string): void => {
  trackEvent({
    category: 'Cart',
    action: 'add',
    label: item.name,
    value: item.price * item.quantity,
    timestamp: Date.now(),
    userId,
    properties: {
      productId: item.productId,
      quantity: item.quantity,
      price: item.price
    }
  });
};

export const trackCheckout = (cart: Cart, userId?: string): void => {
  trackEvent({
    category: 'Checkout',
    action: 'complete',
    label: 'purchase',
    value: cart.total,
    timestamp: Date.now(),
    userId,
    properties: {
      items: Array.isArray(cart.items) ? cart.items.length : 0,
      subtotal: cart.subtotal,
      shipping: cart.shipping,
      tax: cart.tax,
      discount: cart.discount || 0
    }
  });
};

export const trackBlogView = (post: BlogPost, userId?: string): void => {
  trackEvent({
    category: 'Blog',
    action: 'view',
    label: post.title,
    timestamp: Date.now(),
    userId,
    properties: {
      postId: post.id,
      category: post.category,
      readTime: 0 // Will be updated when user leaves the page
    }
  });
};

export const trackSearch = (query: string, results: number, userId?: string): void => {
  trackEvent({
    category: 'Search',
    action: 'query',
    label: query,
    value: results,
    timestamp: Date.now(),
    userId,
    properties: {
      resultsCount: results
    }
  });
};

export const trackError = (error: Error, userId?: string): void => {
  trackEvent({
    category: 'Error',
    action: 'error',
    label: error.name,
    value: 1,
    timestamp: Date.now(),
    userId,
    properties: {
      message: error.message,
      stack: error.stack
    }
  });
};

export const calculateProductAnalytics = (products: Product[]): ProductAnalytics[] => {
  return products.map(product => ({
    productId: product.id,
    views: 0,
    clicks: 0,
    addToCart: 0,
    purchases: 0,
    revenue: 0,
    averagePrice: product.price,
    conversionRate: 0
  }));
};

export const calculateUserAnalytics = (user: User): UserAnalytics => ({
  userId: user.id,
  sessions: 0,
  pageViews: 0,
  timeOnSite: 0,
  cartAbandonmentRate: 0,
  purchaseRate: 0,
  averageOrderValue: 0,
  totalPurchases: 0,
  totalRevenue: 0
});

export const calculateCartAnalytics = (cart: Cart): CartAnalytics => {
  const totalItems = Array.isArray(cart.items) 
    ? cart.items.reduce((sum, item) => sum + item.quantity, 0)
    : 0;
  const averageCartValue = totalItems > 0 ? cart.total / totalItems : 0;
  
  return {
    cartId: cart.id,
    totalItems,
    totalValue: cart.total,
    averageCartValue,
    conversionRate: 0,
    abandonRate: 0,
    mostAddedProducts: [],
    mostRemovedProducts: [],
    totals: {
      subtotal: cart.subtotal || 0,
      tax: cart.tax || 0,
      shipping: cart.shipping || 0,
      discount: cart.discount || 0,
      total: cart.total || 0
    }
  };
};

export const calculateBlogAnalytics = (post: BlogPost): BlogAnalytics => ({
  postId: post.id,
  views: 0,
  readTime: 0,
  shares: 0,
  comments: post.comments?.length || 0,
  conversionRate: 0
});

export const updateAnalytics = (analytics: Record<string, any>, event: AnalyticsEvent): Record<string, any> => {
  try {
    if (!analytics) return null;
    
    switch (event.category) {
      case 'Product':
        if (event.action === 'view') {
          analytics.views = (analytics.views || 0) + 1;
        } else if (event.action === 'click') {
          analytics.clicks = (analytics.clicks || 0) + 1;
        } else if (event.action === 'add') {
          analytics.addToCart = (analytics.addToCart || 0) + 1;
          analytics.revenue = (analytics.revenue || 0) + (event.value || 0);
        } else if (event.action === 'purchase') {
          analytics.purchases = (analytics.purchases || 0) + 1;
          analytics.revenue = (analytics.revenue || 0) + (event.value || 0);
        }
        break;
      
      case 'Cart':
        if (event.action === 'add') {
          analytics.totalItems = (analytics.totalItems || 0) + (event.properties?.quantity || 0);
          analytics.totalValue = (analytics.totalValue || 0) + (event.value || 0);
        } else if (event.action === 'remove') {
          analytics.totalItems = Math.max(0, (analytics.totalItems || 0) - (event.properties?.quantity || 0));
        }
        break;
      
      case 'Checkout':
        if (event.action === 'complete') {
          const addToCart = analytics.addToCart || 0;
          const purchases = analytics.purchases || 0;
          analytics.conversionRate = addToCart > 0 ? (purchases / addToCart) * 100 : 0;
        }
        break;
      
      case 'Blog':
        if (event.action === 'view') {
          analytics.views = (analytics.views || 0) + 1;
        }
        break;
    }
    
    return analytics;
  } catch (error) {
    console.error('Failed to update analytics:', error);
    return analytics;
  }
};
