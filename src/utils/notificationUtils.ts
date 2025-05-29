// File_name : src/utils/notificationUtils.ts

import { User } from '../types/userTypes';
import { Product } from '../types/productTypes';
import { BlogPost } from '../types/blogTypes';
import { Cart } from '../types/cartTypes';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  userId?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  meta?: {
    product?: Product;
    blogPost?: BlogPost;
    cart?: Cart;
    [key: string]: any;
  };
}

export interface NotificationOptions {
  type?: NotificationType;
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  meta?: {
    [key: string]: any;
  };
}

export class NotificationManager {
  private static instance: NotificationManager;
  private notifications: Notification[] = [];
  private notificationIdCounter = 0;

  private constructor() {}

  public static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  public addNotification(options: NotificationOptions): string {
    const notification: Notification = {
      id: `notification-${this.notificationIdCounter++}`,
      type: options.type || 'info',
      title: options.title || 'Notification',
      message: options.message,
      timestamp: Date.now(),
      action: options.action,
      meta: options.meta
    };

    this.notifications.push(notification);
    
    // Automatically remove notification after duration
    if (options.duration) {
      setTimeout(() => {
        this.removeNotification(notification.id);
      }, options.duration);
    }

    return notification.id;
  }

  public removeNotification(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
  }

  public clearAllNotifications(): void {
    this.notifications = [];
  }

  public getNotifications(): Notification[] {
    return [...this.notifications];
  }

  public getActiveNotifications(): Notification[] {
    return this.notifications.filter(n => !n.meta?.dismissed);
  }

  public markAsRead(id: string): boolean {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.meta = {
        ...notification.meta,
        read: true,
        readAt: Date.now()
      };
      return true;
    }
    return false;
  }

  public dismiss(id: string): boolean {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.meta = {
        ...notification.meta,
        dismissed: true,
        dismissedAt: Date.now()
      };
      return true;
    }
    return false;
  }

  public static success(message: string, options: Partial<NotificationOptions> = {}): string {
    return NotificationManager.getInstance().addNotification({
      type: 'success',
      message,
      ...options
    });
  }

  public static error(message: string, options: Partial<NotificationOptions> = {}): string {
    return NotificationManager.getInstance().addNotification({
      type: 'error',
      message,
      ...options
    });
  }

  public static warning(message: string, options: Partial<NotificationOptions> = {}): string {
    return NotificationManager.getInstance().addNotification({
      type: 'warning',
      message,
      ...options
    });
  }

  public static info(message: string, options: Partial<NotificationOptions> = {}): string {
    return NotificationManager.getInstance().addNotification({
      type: 'info',
      message,
      ...options
    });
  }
}

// Helper functions for common notification scenarios
export const notifyProductAdded = (product: Product, quantity: number): string => {
  return NotificationManager.success(
    `Produit ajouté au panier`,
    {
      message: `${quantity} ${product.name} a été ajouté(e) au panier`,
      meta: { product, quantity }
    }
  );
};

export const notifyCheckoutSuccess = (cart: Cart): string => {
  return NotificationManager.success(
    `Commande confirmée`,
    {
      message: `Votre commande a été confirmée. Montant total: ${cart.total.toFixed(2)}€`,
      meta: { cart }
    }
  );
};

export const notifyError = (error: Error): string => {
  return NotificationManager.error(
    `Erreur`,
    {
      message: error.message,
      meta: { error }
    }
  );
};

export const notifyBlogPostPublished = (post: BlogPost): string => {
  return NotificationManager.success(
    `Article publié`,
    {
      message: `Votre article "${post.title}" a été publié avec succès`,
      meta: { blogPost: post }
    }
  );
};
