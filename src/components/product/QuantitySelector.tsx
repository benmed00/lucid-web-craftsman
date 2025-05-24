import React from 'react';

interface QuantitySelectorProps {
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  readOnly?: boolean;
}

const QuantitySelector: React.FC<QuantitySelectorProps> = ({ 
  quantity, 
  onIncrement, 
  onDecrement, 
  readOnly = false 
}) => {
  return (
    <div>
      <label className="block text-sm font-medium text-stone-700 mb-2">
        Quantité
      </label>
      <div className="flex">
        <button
          className="border border-stone-300 rounded-l-md px-3 py-2 hover:bg-stone-50"
          onClick={onDecrement}
          disabled={readOnly || quantity <= 1} // Disable if quantity is 1 or less, or if readOnly
        >
          -
        </button>
        <input
          type="text"
          value={quantity}
          readOnly // Input is always readOnly, controlled by buttons
          className="border-t border-b border-stone-300 px-4 py-2 w-16 text-center focus:outline-none"
        />
        <button
          className="border border-stone-300 rounded-r-md px-3 py-2 hover:bg-stone-50"
          onClick={onIncrement}
          disabled={readOnly}
        >
          +
        </button>
      </div>
    </div>
  );
};

export default QuantitySelector;
