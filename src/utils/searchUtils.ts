// File_name : src/utils/searchutils.ts

import { Product, ProductCategory } from '../types/productTypes';
import { BlogPost, BlogCategory } from '../types/blogTypes';
import { CountryCode } from '../types/commonTypes';

export interface SearchOptions {
  query?: string;
  category?: string;
  priceRange?: {
    min?: number;
    max?: number;
  };
  sortBy?: 'relevance' | 'price' | 'date' | 'rating';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export const searchProducts = (
  products: Product[],
  options: SearchOptions = {}
): Product[] => {
  const { query, category, priceRange, sortBy = 'relevance', sortOrder = 'asc' } = options;

  let filtered = [...products];

  // Filter by category
  if (category && category !== 'all') {
    filtered = filtered.filter(p => p.category === category);
  }

  // Filter by price range
  if (priceRange?.min || priceRange?.max) {
    filtered = filtered.filter(p => {
      const price = p.price;
      return (!priceRange?.min || price >= priceRange.min) &&
             (!priceRange?.max || price <= priceRange.max);
    });
  }

  // Filter by search query
  if (query) {
    const searchTerms = query.toLowerCase().split(' ');
    filtered = filtered.filter(p => {
      const text = [
        p.name.toLowerCase(),
        p.description.toLowerCase(),
        p.category.toLowerCase(),
        ...p.features.map(f => f.toLowerCase()),
        ...p.materials.map(m => m.toLowerCase())
      ].join(' ');
      return searchTerms.every(term => text.includes(term));
    });
  }

  // Sort results
  switch (sortBy) {
    case 'price':
      filtered.sort((a, b) => sortOrder === 'asc' ? a.price - b.price : b.price - a.price);
      break;
    case 'date':
      filtered.sort((a, b) => sortOrder === 'asc' ? 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() : 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      break;
    case 'rating':
      filtered.sort((a, b) => sortOrder === 'asc' ? 
        (a.rating || 0) - (b.rating || 0) : 
        (b.rating || 0) - (a.rating || 0)
      );
      break;
    default: // relevance (search term matches)
      if (query) {
        filtered.sort((a, b) => {
          const aScore = getSearchScore(a, query);
          const bScore = getSearchScore(b, query);
          return sortOrder === 'asc' ? aScore - bScore : bScore - aScore;
        });
      }
  }

  return filtered;
};

const getSearchScore = (product: Product, query: string): number => {
  const terms = query.toLowerCase().split(' ');
  let score = 0;

  // Exact matches in title get highest score
  if (product.name.toLowerCase().includes(query.toLowerCase())) {
    score += 5;
  }

  // Partial matches in title
  if (terms.some(term => product.name.toLowerCase().includes(term))) {
    score += 3;
  }

  // Matches in description
  if (terms.some(term => product.description.toLowerCase().includes(term))) {
    score += 2;
  }

  // Matches in features
  if (terms.some(term => product.features.some(f => f.toLowerCase().includes(term)))) {
    score += 1;
  }

  return score;
};

export const searchBlogPosts = (
  posts: BlogPost[],
  options: SearchOptions = {}
): BlogPost[] => {
  const { query, category, sortBy = 'date', sortOrder = 'desc' } = options;

  let filtered = [...posts];

  // Filter by category
  if (category && category !== 'all') {
    filtered = filtered.filter(p => p.category === category);
  }

  // Filter by search query
  if (query) {
    const searchTerms = query.toLowerCase().split(' ');
    filtered = filtered.filter(p => {
      const text = [
        p.title.toLowerCase(),
        p.content.toLowerCase(),
        p.category.toLowerCase(),
        p.author.name.toLowerCase()
      ].join(' ');
      return searchTerms.every(term => text.includes(term));
    });
  }

  // Sort results
  switch (sortBy) {
    case 'date':
      filtered.sort((a, b) => sortOrder === 'asc' ? 
        new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime() : 
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
      break;
    case 'relevance':
      if (query) {
        filtered.sort((a, b) => {
          const aScore = getBlogSearchScore(a, query);
          const bScore = getBlogSearchScore(b, query);
          return sortOrder === 'asc' ? aScore - bScore : bScore - aScore;
        });
      }
      break;
  }

  return filtered;
};

const getBlogSearchScore = (post: BlogPost, query: string): number => {
  const terms = query.toLowerCase().split(' ');
  let score = 0;

  // Exact matches in title get highest score
  if (post.title.toLowerCase().includes(query.toLowerCase())) {
    score += 5;
  }

  // Partial matches in title
  if (terms.some(term => post.title.toLowerCase().includes(term))) {
    score += 3;
  }

  // Matches in content
  if (terms.some(term => post.content.toLowerCase().includes(term))) {
    score += 2;
  }

  // Matches in author name
  if (terms.some(term => post.author.name.toLowerCase().includes(term))) {
    score += 1;
  }

  return score;
};

export const getFilteredProductsCount = (products: Product[], options: SearchOptions): number => {
  return searchProducts(products, options).length;
};

export const getFilteredBlogPostsCount = (posts: BlogPost[], options: SearchOptions): number => {
  return searchBlogPosts(posts, options).length;
};

export const getPaginationRange = (page: number, pageSize: number, total: number): { from: number; to: number } => {
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return { from, to };
};
