// File_name : src/types/product

import type { CountryCode, Address } from './commonTypes';

export type ProductStatus = 'active' | 'out_of_stock' | 'coming_soon' | 'discontinued';

export type ProductCategory = 'furniture' | 'decor' | 'lighting' | 'accessories' | 'outdoor';

export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  isMain: boolean;
}

export interface ProductVariant {
  id: string;
  name: string;
  price: number;
  stock: number;
  attributes: Record<string, string>;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: ProductCategory;
  price: number;
  status: ProductStatus;
  stock: number;
  rating: number;
  reviewsCount: number;
  images: ProductImage[];
  variants: ProductVariant[];
  features: string[];
  materials: string[];
  dimensions: {
    width: number;
    height: number;
    depth: number;
    unit: 'cm' | 'm' | 'in';
  };
  shippingInfo: {
    weight: number;
    unit: 'kg' | 'lb';
    shippingCountries: CountryCode[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface ProductFilter {
  category?: ProductCategory[];
  priceRange?: {
    min: number;
    max: number;
  };
  inStock?: boolean;
  sortBy?: 'price_asc' | 'price_desc' | 'newest' | 'popularity';
  page?: number;
  pageSize?: number;
}

export interface CartItem {
  productId: string;
  variantId: string;
  quantity: number;
  price: number;
  name: string;
  image: string;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  shippingAddress?: Address;
  billingAddress?: Address;
  couponCode?: string;
  discount?: number;
}
