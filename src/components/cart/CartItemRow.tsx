import React from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import QuantitySelector from '@/components/product/QuantitySelector'; // Assuming path
import { Product as ProductInterface } from '@/shared/interfaces/Iproduct.interface'; // Using the existing Product interface

// Define CartItem type based on expected structure from Cart.tsx
export interface CartItem {
  id: number; // This is the product ID
  quantity: number;
  product: ProductInterface; // Using the imported Product interface
}

interface CartItemRowProps {
  item: CartItem;
  onQuantityChange: (productId: number, newQuantity: number) => void;
  onRemoveItem: (productId: number) => void;
  // Add any other props needed for loading/disabled states from mutations if applicable
  isUpdating?: boolean; // Example: if a specific row is being updated
}

const CartItemRow: React.FC<CartItemRowProps> = ({
  item,
  onQuantityChange,
  onRemoveItem,
  isUpdating = false
}) => {
  const handleIncrement = () => {
    onQuantityChange(item.id, item.quantity + 1);
  };

  const handleDecrement = () => {
    if (item.quantity > 1) {
      onQuantityChange(item.id, item.quantity - 1);
    } else {
      // Optionally, call onRemoveItem if quantity becomes 0, or handle as error/do nothing
      // For now, QuantitySelector itself disables decrement at 1.
      // If we want to remove at 0, this logic could be: onQuantityChange(item.id, 0);
      // and the parent mutation would handle it.
      // Or, simply rely on QuantitySelector's own min=1 behavior.
    }
  };

  return (
    <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
      {/* Product Info */}
      <div className="md:col-span-6 flex items-center">
        <Link
          to={`/products/${item.product.id}`}
          className="flex items-center hover:bg-stone-50 rounded-md p-2 transition"
        >
          <div className="w-20 h-20 rounded-md overflow-hidden mr-4">
            <img
              src={item.product.images[0]}
              alt={item.product.name}
              className="w-full h-full object-cover"
            />
          </div>
          <h3 className="font-medium text-stone-800">
            {item.product.name}
          </h3>
        </Link>

        {/* Remove Button (outside the Link!) */}
        <button
          className="ml-4 mt-1 text-stone-400 hover:text-stone-600 text-sm flex items-center"
          onClick={() => onRemoveItem(item.id)}
          disabled={isUpdating}
        >
          <X className="h-3 w-3 mr-1" /> Retirer
        </button>
      </div>

      {/* Price */}
      <div className="md:col-span-2 md:text-center">
        <div className="md:hidden text-sm text-stone-500">
          Prix:
        </div>
        <div>{item.product.price} €</div>
      </div>

      {/* Quantity */}
      <div className="md:col-span-2 md:text-center">
        <div className="md:hidden text-sm text-stone-500">
          Quantité:
        </div>
        <QuantitySelector
          quantity={item.quantity}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
          readOnly={isUpdating}
        />
      </div>

      {/* Total */}
      <div className="md:col-span-2 md:text-right">
        <div className="md:hidden text-sm text-stone-500">
          Total:
        </div>
        <div className="font-medium">
          {(item.product.price * item.quantity).toFixed(2)} €
        </div>
      </div>
    </div>
  );
};

export default CartItemRow;
