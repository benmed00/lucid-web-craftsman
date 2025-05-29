import type { Product, ProductFilter } from './productTypes';
import type { BlogPost, BlogFilter } from './blogTypes';
import type { User } from './userTypes';
import type { Cart, CartActions } from './cartTypes';
import type { ValidationPattern, ValidationMessages } from './formTypes';

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
  timestamp: string;
}

export interface ApiError {
  code: number;
  message: string;
  details?: Record<string, any>;
}

export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  headers: Record<string, string>;
  retryCount: number;
  retryDelay: number;
}

export interface ApiEndpoints {
  products: {
    list: string;
    detail: string;
    search: string;
  };
  blog: {
    posts: string;
    categories: string;
    tags: string;
  };
  cart: {
    create: string;
    update: string;
    checkout: string;
  };
  auth: {
    login: string;
    register: string;
    logout: string;
    refresh: string;
  };
}

export interface ApiRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, any>;
  timeout?: number;
  retry?: number;
}

export interface ApiClient {
  products: {
    list: (filter?: ProductFilter) => Promise<ApiResponse<Product[]>>;
    get: (id: string) => Promise<ApiResponse<Product>>;
    search: (query: string) => Promise<ApiResponse<Product[]>>;
  };
  blog: {
    posts: (filter?: BlogFilter) => Promise<ApiResponse<BlogPost[]>>;
    post: (id: string) => Promise<ApiResponse<BlogPost>>;
    categories: () => Promise<ApiResponse<string[]>>;
    tags: () => Promise<ApiResponse<string[]>>;
  };
  cart: {
    create: () => Promise<ApiResponse<Cart>>;
    update: (cartId: string, updates: Partial<Cart>) => Promise<ApiResponse<Cart>>;
    checkout: (cartId: string) => Promise<ApiResponse<void>>;
  };
  auth: {
    login: (credentials: any) => Promise<ApiResponse<User>>;
    register: (userData: any) => Promise<ApiResponse<User>>;
    logout: () => Promise<ApiResponse<void>>;
    refresh: (token: string) => Promise<ApiResponse<User>>;
  };
}
