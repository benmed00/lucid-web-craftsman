// src/components/BlogCard.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
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
    const { getByText, getByAltText } = render(
      <MemoryRouter>
        <BlogCard post={mockPostData} />
      </MemoryRouter>
    );

    // Check for the title
    expect(getByText(mockPostData.title)).toBeInTheDocument();

    // Check for the excerpt
    expect(getByText(mockPostData.excerpt)).toBeInTheDocument();

    // Check for the date
    expect(getByText(mockPostData.date)).toBeInTheDocument();

    // Check for the category
    expect(getByText(mockPostData.category)).toBeInTheDocument();

    // Check for the author
    expect(getByText(mockPostData.author)).toBeInTheDocument();

    // Check for the image (by alt text, which is the title)
    expect(getByAltText(mockPostData.title)).toBeInTheDocument();

    // Check for the "Lire la suite" (Read more) link/button text
    // The Link component wraps the Button, so we might look for the button's content
    // or ensure the link itself is present and points to the correct URL.
    const readMoreLink = getByText(/Lire la suite/i).closest('a');
    expect(readMoreLink).toBeInTheDocument();
    expect(readMoreLink).toHaveAttribute('href', `/blog/${mockPostData.id}`);
  });

  it('renders the image with correct src and alt attributes', () => {
    const { getByAltText } = render(
      <MemoryRouter>
        <BlogCard post={mockPostData} />
      </MemoryRouter>
    );
    const imageElement = getByAltText(mockPostData.title) as HTMLImageElement;
    expect(imageElement.src).toContain(mockPostData.image);
  });
});
