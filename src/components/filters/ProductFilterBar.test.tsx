// src/components/filters/ProductFilterBar.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProductFilterBar from './ProductFilterBar'; // Assuming path is correct

describe('ProductFilterBar', () => {
  const mockOnFilterChange = vi.fn();
  const mockOnSortChange = vi.fn();

  beforeEach(() => {
    mockOnFilterChange.mockClear();
    mockOnSortChange.mockClear();
  });

  it('renders filter badges and sort dropdown', () => {
    render(
      <ProductFilterBar
        activeFilter="all"
        onFilterChange={mockOnFilterChange}
        currentSort="popular"
        onSortChange={mockOnSortChange}
      />
    );

    expect(screen.getByText('Tous les produits')).toBeInTheDocument();
    expect(screen.getByText('Sacs')).toBeInTheDocument();
    expect(screen.getByText('Chapeaux')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Trier par: Populaire')).toBeInTheDocument(); // Check by label
  });

  it('highlights the active filter badge', () => {
    render(
      <ProductFilterBar
        activeFilter="sacs"
        onFilterChange={mockOnFilterChange}
        currentSort="popular"
        onSortChange={mockOnSortChange}
      />
    );
    // Active badge should have specific classes (this depends on implementation)
    // Example: check for classes that include 'bg-olive-50' and 'text-olive-800'
    const activeBadge = screen.getByText('Sacs');
    expect(activeBadge).toHaveClass('border-olive-300'); // More specific check if possible
    expect(activeBadge).toHaveClass('bg-olive-50');
    expect(activeBadge).toHaveClass('text-olive-800');

    const inactiveBadge = screen.getByText('Tous les produits');
    expect(inactiveBadge).not.toHaveClass('bg-olive-50');
  });

  it('calls onFilterChange with the correct category when a filter badge is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ProductFilterBar
        activeFilter="all"
        onFilterChange={mockOnFilterChange}
        currentSort="popular"
        onSortChange={mockOnSortChange}
      />
    );

    const sacsBadge = screen.getByText('Sacs');
    await user.click(sacsBadge);

    expect(mockOnFilterChange).toHaveBeenCalledTimes(1);
    expect(mockOnFilterChange).toHaveBeenCalledWith('sacs');
  });

  it('calls onSortChange with the correct sort key when a sort option is selected', async () => {
    const user = userEvent.setup();
    render(
      <ProductFilterBar
        activeFilter="all"
        onFilterChange={mockOnFilterChange}
        currentSort="popular" // Initial sort value
        onSortChange={mockOnSortChange}
      />
    );

    const sortDropdown = screen.getByRole('combobox');
    // Select by the value of the option
    await user.selectOptions(sortDropdown, 'price-asc');

    expect(mockOnSortChange).toHaveBeenCalledTimes(1);
    expect(mockOnSortChange).toHaveBeenCalledWith('price-asc');
  });

  it('displays the currentSort value in the dropdown', () => {
    render(
      <ProductFilterBar
        activeFilter="all"
        onFilterChange={mockOnFilterChange}
        currentSort="price-desc" // Set a specific sort
        onSortChange={mockOnSortChange}
      />
    );
    // The <select> element's value will be the key, e.g., 'price-desc'
    // The displayed text for this option will be 'Prix: Décroissant'
    const selectElement = screen.getByRole('combobox') as HTMLSelectElement;
    expect(selectElement.value).toBe('price-desc');

    // To check the displayed label of the selected option:
    const selectedOption = Array.from(selectElement.options).find(opt => opt.selected);
    expect(selectedOption?.textContent).toBe('Prix: Décroissant');
  });

  it('matches snapshot', () => {
    const { container } = render(
      <ProductFilterBar
        activeFilter="all"
        onFilterChange={mockOnFilterChange}
        currentSort="popular"
        onSortChange={mockOnSortChange}
      />
    );
    expect(container).toMatchSnapshot();
  });
});
