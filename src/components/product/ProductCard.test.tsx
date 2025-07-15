// src/components/product/ProductCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom'; // Needed because ProductCard uses <Link>
import ProductCard from './ProductCard';
import { Product } from '@/shared/interfaces/Iproduct.interface'; // Adjust path as necessary

const mockProduct: Product = {
  id: 1,
  name: 'Sac Artisanal',
  category: 'Sacs',
  price: 75,
  images: ['/test-image.jpg'],
  description: 'Un beau sac fait main.',
  new: true,
  artisan: 'Artisan Test',
  artisanStory: 'Story here',
  details: 'Details here',
  care: 'Care here',
  related: []
};

const mockProductNotNew: Product = {
  ...mockProduct,
  id: 2,
  name: 'Chapeau Simple',
  new: false,
};

const mockOnAddToCart = vi.fn();

// Wrapper component to provide Router context
const renderWithRouter = (ui: React.ReactElement) => {
  return render(ui, { wrapper: BrowserRouter });
};

describe('ProductCard', () => {
  beforeEach(() => {
    mockOnAddToCart.mockClear();
  });

  it('renders product information correctly', () => {
    const { container } = renderWithRouter(
      <ProductCard product={mockProduct} onAddToCart={mockOnAddToCart} />
    );

    expect(screen.getByText('Sac Artisanal')).toBeInTheDocument();
    expect(screen.getByText('Sacs')).toBeInTheDocument();
    expect(screen.getByText(/75\s*€/)).toBeInTheDocument(); // Regex for price with euro symbol
    expect(screen.getByAltText('Sac Artisanal')).toHaveAttribute('src', '/test-image.jpg');
    expect(screen.getByText('Nouveau')).toBeInTheDocument(); // Test for "new" badge

    // Optional: Snapshot test
    // expect(container).toMatchSnapshot();
  });

  it('does not render "new" badge if product.new is false', () => {
    renderWithRouter(
      <ProductCard product={mockProductNotNew} onAddToCart={mockOnAddToCart} />
    );
    expect(screen.queryByText('Nouveau')).not.toBeInTheDocument();
  });

  it('handles onAddToCart click', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <ProductCard product={mockProduct} onAddToCart={mockOnAddToCart} />
    );

    const addButton = screen.getByRole('button', { name: /ajouter/i });
    await user.click(addButton);

    expect(mockOnAddToCart).toHaveBeenCalledTimes(1);
    // The first argument to onAddToCart is the product, the second is the event.
    // We can check if it was called with the product.
    expect(mockOnAddToCart.mock.calls[0][0]).toEqual(mockProduct);
  });

  // Example of a snapshot test (uncomment to use)
  it('matches snapshot', () => {
    const { container } = renderWithRouter(
      <ProductCard product={mockProduct} onAddToCart={mockOnAddToCart} />
    );
    expect(container).toMatchSnapshot();
  });
});
