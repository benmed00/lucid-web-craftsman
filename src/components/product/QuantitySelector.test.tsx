// src/components/product/QuantitySelector.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuantitySelector from './QuantitySelector'; // Assuming path is correct

describe('QuantitySelector', () => {
  const mockOnIncrement = vi.fn();
  const mockOnDecrement = vi.fn();

  beforeEach(() => {
    mockOnIncrement.mockClear();
    mockOnDecrement.mockClear();
  });

  it('renders initial quantity correctly', () => {
    render(
      <QuantitySelector
        quantity={5}
        onIncrement={mockOnIncrement}
        onDecrement={mockOnDecrement}
      />
    );
    // The quantity is displayed in an input field
    expect(screen.getByDisplayValue('5')).toBeInTheDocument();
  });

  it('calls onIncrement when "+" button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <QuantitySelector
        quantity={5}
        onIncrement={mockOnIncrement}
        onDecrement={mockOnDecrement}
      />
    );

    const incrementButton = screen.getByRole('button', { name: '+' });
    await user.click(incrementButton);

    expect(mockOnIncrement).toHaveBeenCalledTimes(1);
  });

  it('calls onDecrement when "-" button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <QuantitySelector
        quantity={5} // Start with a quantity > 1 so decrement is enabled
        onIncrement={mockOnIncrement}
        onDecrement={mockOnDecrement}
      />
    );

    const decrementButton = screen.getByRole('button', { name: '-' });
    await user.click(decrementButton);

    expect(mockOnDecrement).toHaveBeenCalledTimes(1);
  });

  it('disables "-" button when quantity is 1', () => {
    render(
      <QuantitySelector
        quantity={1}
        onIncrement={mockOnIncrement}
        onDecrement={mockOnDecrement}
      />
    );
    const decrementButton = screen.getByRole('button', { name: '-' });
    expect(decrementButton).toBeDisabled();
  });

  it('does not call onDecrement when quantity is 1 and "-" button is clicked (though disabled)', async () => {
    const user = userEvent.setup();
    render(
      <QuantitySelector
        quantity={1}
        onIncrement={mockOnIncrement}
        onDecrement={mockOnDecrement}
      />
    );
    const decrementButton = screen.getByRole('button', { name: '-' });
    if (!decrementButton.hasAttribute('disabled')) { // Should be disabled, but guard click
        await user.click(decrementButton);
    }
    expect(mockOnDecrement).not.toHaveBeenCalled();
  });

  it('disables buttons when readOnly is true', () => {
    render(
      <QuantitySelector
        quantity={5}
        onIncrement={mockOnIncrement}
        onDecrement={mockOnDecrement}
        readOnly={true}
      />
    );
    const incrementButton = screen.getByRole('button', { name: '+' });
    const decrementButton = screen.getByRole('button', { name: '-' });

    expect(incrementButton).toBeDisabled();
    expect(decrementButton).toBeDisabled(); // Also disabled because readOnly
  });

  it('matches snapshot', () => {
    const { container } = render(
      <QuantitySelector
        quantity={3}
        onIncrement={mockOnIncrement}
        onDecrement={mockOnDecrement}
      />
    );
    expect(container).toMatchSnapshot();
  });
});
