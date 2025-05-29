// File_name : src/types/blogTypes.ts

export type BlogPostStatus = 'draft' | 'published' | 'scheduled';

export type BlogCategory = 'design' | 'inspiration' | 'tips' | 'news' | 'events';

export interface BlogImage {
  id: string;
  url: string;
  alt: string;
  width: number;
  height: number;
}

export interface BlogAuthor {
  id: string;
  name: string;
  role: string;
  avatar: string;
  bio: string;
}

export interface BlogTag {
  id: string;
  name: string;
  slug: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  status: BlogPostStatus;
  featuredImage: BlogImage;
  images: BlogImage[];
  author: BlogAuthor;
  category: BlogCategory;
  tags: BlogTag[];
  readingTime: number;
  views: number;
  likes: number;
  comments: number;
  publishedAt: string;
  updatedAt: string;
  metaDescription: string;
  metaKeywords: string[];
  canonicalUrl: string;
}

export interface BlogFilter {
  category?: BlogCategory[];
  tag?: string[];
  author?: string;
  search?: string;
  sortBy?: 'date_desc' | 'date_asc' | 'popular' | 'trending';
  page?: number;
  pageSize?: number;
}

export interface BlogComment {
  id: string;
  postId: string;
  author: {
    name: string;
    email: string;
  };
  content: string;
  createdAt: string;
  replies?: BlogComment[];
  likes: number;
}
