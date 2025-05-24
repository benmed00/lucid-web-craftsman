// src/components/BlogCard.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom'; // Required because BlogCard uses <Link>
import BlogCard from './BlogCard';

// Mock data for the BlogCardProps['post']
const mockPostData = {
  id: 1,
  title: 'My Awesome Blog Post Title',
  excerpt: 'This is a short and sweet excerpt for the blog post.',
  image: '/path/to/test-image.jpg', // Provide a mock image path
  date: 'January 25, 2024',
  author: 'John Doe',
  category: 'Technology',
};

describe('BlogCard Component', () => {
  it('renders the blog card with all essential post details', () => {
    render(
      <MemoryRouter>
        <BlogCard post={mockPostData} />
      </MemoryRouter>
    );

    // Check for the title
    expect(screen.getByText(mockPostData.title)).toBeInTheDocument();

    // Check for the excerpt
    expect(screen.getByText(mockPostData.excerpt)).toBeInTheDocument();

    // Check for the date
    expect(screen.getByText(mockPostData.date)).toBeInTheDocument();

    // Check for the category
    expect(screen.getByText(mockPostData.category)).toBeInTheDocument();
    
    // Check for the author
    expect(screen.getByText(mockPostData.author)).toBeInTheDocument();

    // Check for the image (by alt text, which is the title)
    expect(screen.getByAltText(mockPostData.title)).toBeInTheDocument();

    // Check for the "Lire la suite" (Read more) link/button text
    // The Link component wraps the Button, so we might look for the button's content
    // or ensure the link itself is present and points to the correct URL.
    const readMoreLink = screen.getByText(/Lire la suite/i).closest('a');
    expect(readMoreLink).toBeInTheDocument();
    expect(readMoreLink).toHaveAttribute('href', `/blog/${mockPostData.id}`);
  });

  it('renders the image with correct src and alt attributes', () => {
    render(
      <MemoryRouter>
        <BlogCard post={mockPostData} />
      </MemoryRouter>
    );
    const imageElement = screen.getByAltText(mockPostData.title) as HTMLImageElement;
    expect(imageElement.src).toContain(mockPostData.image);
  });
});
