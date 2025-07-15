// src/api/mockApiService.test.ts
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';

// Import the actual api instance and functions from the module
import {
  api, // This is the actual instance we will monkey-patch
  getProducts,
  getProductById,
  getCart,
  addToCart,
  updateCartItemQuantity,
  removeFromCart,
  getBlogPosts,
  getBlogPostById,
  // Ensure CartState is correctly typed or imported if it's a named export from mockApiService
  // For now, we'll use a local interface definition if it's not explicitly exported as a value.
} from './mockApiService';
import type { Product } from '../shared/interfaces/Iproduct.interface';
import type { AxiosRequestConfig } from 'axios'; // For AxiosError simulation

// Define types locally for test data consistency
interface CartItem {
  id: number;
  product: Product;
  quantity: number;
}
interface CartState {
  items: CartItem[];
}
interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  image: string;
  date: string;
  author: string;
  category: string;
  content?: string;
  featured?: boolean;
}

// Store original implementations
const originalApiGet = api.get;
const originalApiPost = api.post;

// Sample Data
const mockProductArray: Product[] = [
  { id: 1, name: 'Product 1', category: 'Category A', price: 100, images: ['/assets/images/p1.jpg'], description: 'Desc 1', details: 'Details 1', care: 'Care 1', new: true, artisan: 'Artisan A', artisanStory: 'Story A', related: [2] },
  { id: 2, name: 'Product 2', category: 'Category B', price: 200, images: ['/assets/images/p2.jpg'], description: 'Desc 2', details: 'Details 2', care: 'Care 2', new: false, artisan: 'Artisan B', artisanStory: 'Story B', related: [1] },
];
const mockSingleProduct: Product = { id: 1, name: 'Product 1', category: 'Category A', price: 100, images: ['/assets/images/p1.jpg'], description: 'Desc 1', details: 'Details 1', care: 'Care 1', new: true, artisan: 'Artisan A', artisanStory: 'Story A', related: [2] };
const mockEmptyCart: CartState = { items: [] };
const mockBlogPostsArrayData: BlogPost[] = [
  { id: 1, title: 'Blog Post 1', excerpt: 'Excerpt 1', image: '/assets/images/blog1.jpg', date: '2023-01-01', author: 'Author A', category: 'Tech', content: 'Content 1', featured: true },
  { id: 2, title: 'Blog Post 2', excerpt: 'Excerpt 2', image: '/assets/images/blog2.jpg', date: '2023-01-02', author: 'Author B', category: 'Health', content: 'Content 2', featured: false },
];
const mockSingleBlogPostData: BlogPost = { id: 1, title: 'Blog Post 1', excerpt: 'Excerpt 1', image: '/assets/images/blog1.jpg', date: '2023-01-01', author: 'Author A', category: 'Tech', content: 'Content 1', featured: true };


describe('mockApiService', () => {
  beforeEach(() => {
    // Directly mock the methods of the imported 'api' instance
    api.get = vi.fn() as unknown as typeof api.get;
    api.post = vi.fn() as unknown as typeof api.post;
  });

  afterAll(() => {
    // Restore original methods after all tests in this suite are done
    api.get = originalApiGet;
    api.post = originalApiPost;
  });

  // --- Product Functions ---
  describe('getProducts', () => {
    it('should fetch products successfully', async () => {
      (api.get as vi.Mock).mockResolvedValue({ data: mockProductArray });
      const products = await getProducts();
      expect(products).toEqual(mockProductArray);
      expect(api.get).toHaveBeenCalledWith('/api/products');
    });

    it('should handle error when fetching products', async () => {
      const errorMessage = 'Network Error';
      (api.get as vi.Mock).mockRejectedValue(new Error(errorMessage));
      await expect(getProducts()).rejects.toThrow(errorMessage);
    });
  });

  describe('getProductById', () => {
    it('should fetch a single product successfully', async () => {
      (api.get as vi.Mock).mockResolvedValue({ data: mockSingleProduct });
      const product = await getProductById(1);
      expect(product).toEqual(mockSingleProduct);
      expect(api.get).toHaveBeenCalledWith('/api/products/1');
    });

    it('should handle error if product not found', async () => {
      const errorMessage = 'Product not found';
      // Simulate Axios error structure for a 404
      const axiosError = { isAxiosError: true, response: { status: 404, data: {} }, config: {} as AxiosRequestConfig, request: {}, message: errorMessage, toJSON: () => ({}) };
      (api.get as vi.Mock).mockRejectedValue(axiosError);
      await expect(getProductById(999)).rejects.toEqual(axiosError);
    });
  });

  // --- Cart Functions ---
  describe('getCart', () => {
    it('should fetch cart successfully', async () => {
      (api.get as vi.Mock).mockResolvedValue({ data: mockEmptyCart });
      const cart = await getCart();
      expect(cart).toEqual(mockEmptyCart);
      expect(api.get).toHaveBeenCalledWith('/api/cart');
    });

    it('should return an empty cart structure on error during getCart', async () => {
      (api.get as vi.Mock).mockRejectedValue(new Error('Network error'));
      const cart = await getCart();
      expect(cart).toEqual({ items: [] });
      expect(api.get).toHaveBeenCalledWith('/api/cart');
    });
  });

  describe('addToCart', () => {
    it('should add a new item to an empty cart', async () => {
      (api.get as vi.Mock).mockResolvedValueOnce({ data: mockEmptyCart });
      const newCartItem = { id: mockSingleProduct.id, product: mockSingleProduct, quantity: 1 };
      const updatedCartData = { items: [newCartItem] };
      (api.post as vi.Mock).mockResolvedValue({ data: updatedCartData });

      const result = await addToCart(mockSingleProduct, 1);

      expect(api.get).toHaveBeenCalledWith('/api/cart');
      expect(api.post).toHaveBeenCalledWith('/api/cart', { items: [newCartItem] });
      expect(result).toEqual(updatedCartData);
    });

    it('should update quantity if item already in cart', async () => {
        const initialCart: CartState = { items: [{ id: mockSingleProduct.id, product: mockSingleProduct, quantity: 1 }] };
        (api.get as vi.Mock).mockResolvedValueOnce({ data: initialCart });

        const expectedPostedCart: CartState = { items: [{ id: mockSingleProduct.id, product: mockSingleProduct, quantity: 3 }] };
        (api.post as vi.Mock).mockResolvedValue({ data: expectedPostedCart });

        const result = await addToCart(mockSingleProduct, 2);

        expect(api.get).toHaveBeenCalledWith('/api/cart');
        expect(api.post).toHaveBeenCalledWith('/api/cart', expectedPostedCart);
        expect(result).toEqual(expectedPostedCart);
    });
  });

  describe('updateCartItemQuantity', () => {
    it('should update an item quantity in the cart', async () => {
      const initialCart: CartState = { items: [{ id: 1, product: mockSingleProduct, quantity: 1 }] };
      (api.get as vi.Mock).mockResolvedValueOnce({ data: initialCart });

      const updatedCartData = { items: [{ id: 1, product: mockSingleProduct, quantity: 3 }] };
      (api.post as vi.Mock).mockResolvedValue({ data: updatedCartData });

      const result = await updateCartItemQuantity(1, 3);

      expect(api.get).toHaveBeenCalledWith('/api/cart');
      expect(api.post).toHaveBeenCalledWith('/api/cart', updatedCartData);
      expect(result).toEqual(updatedCartData);
    });

     it('should remove item if quantity is 0 or less', async () => {
        const initialCart: CartState = { items: [{ id: 1, product: mockSingleProduct, quantity: 1 }] };
        (api.get as vi.Mock).mockResolvedValueOnce({ data: initialCart });

        const expectedPostedCart: CartState = { items: [] };
        (api.post as vi.Mock).mockResolvedValue({ data: expectedPostedCart });

        const result = await updateCartItemQuantity(1, 0);

        expect(api.get).toHaveBeenCalledWith('/api/cart');
        expect(api.post).toHaveBeenCalledWith('/api/cart', expectedPostedCart);
        expect(result).toEqual(expectedPostedCart);
    });
  });

  describe('removeFromCart', () => {
    it('should remove an item from the cart', async () => {
      const initialCart: CartState = { items: [{ id: 1, product: mockSingleProduct, quantity: 1 }] };
      (api.get as vi.Mock).mockResolvedValueOnce({ data: initialCart });

      const updatedCartData = { items: [] };
      (api.post as vi.Mock).mockResolvedValue({ data: updatedCartData });

      const result = await removeFromCart(1);

      expect(api.get).toHaveBeenCalledWith('/api/cart');
      expect(api.post).toHaveBeenCalledWith('/api/cart', { items: [] });
      expect(result).toEqual(updatedCartData);
    });
  });

  // --- Blog Post Functions ---
  describe('getBlogPosts', () => {
    it('should fetch blog posts successfully', async () => {
      (api.get as vi.Mock).mockResolvedValue({ data: mockBlogPostsArrayData });
      const posts = await getBlogPosts();
      expect(posts).toEqual(mockBlogPostsArrayData);
      expect(api.get).toHaveBeenCalledWith('/api/blogPosts');
    });
  });

  describe('getBlogPostById', () => {
    it('should fetch a single blog post successfully', async () => {
      (api.get as vi.Mock).mockResolvedValue({ data: mockSingleBlogPostData });
      const post = await getBlogPostById(1);
      expect(post).toEqual(mockSingleBlogPostData);
      expect(api.get).toHaveBeenCalledWith('/api/blogPosts/1');
    });
  });
});
