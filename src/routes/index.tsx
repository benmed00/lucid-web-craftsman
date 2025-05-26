
// src/routes/index.tsx
import { Home } from 'lucide-react';
import { Routes, Route } from 'react-router-dom';
import BlogPost from '@/pages/BlogPost';
import BlogPage from '@/pages/Blog';

export const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Home />} /        >
    <Route path="/post/:id" element={<BlogPost />} />
    <Route path="/blog" element={<BlogPage />} />
  </Routes>
);
