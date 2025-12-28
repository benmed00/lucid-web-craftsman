import { ShoppingBag } from "lucide-react";
import clsx from "clsx";
import { useCartUI } from "./useCartUI";

/**
 * Icône de panier avec badge dynamique.
 */
const CartIcon = () => {
  const { itemCount, cartColor, badgeTextColor } = useCartUI();

  return (
    <div
      className={clsx(
        "relative p-2 rounded-full transition-colors duration-200",
        cartColor
      )}
      aria-label={`Panier (${itemCount})`}
    >
      <ShoppingBag className="text-primary-foreground" />
      <span
        className={clsx(
          "absolute top-0 right-0 bg-background text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold border transform translate-x-1/4 -translate-y-1/4",
          badgeTextColor,
          itemCount > 1 ? "border-primary" : "border-muted-foreground"
        )}
        style={{ minWidth: 20 }}
        aria-live="polite"
      >
        {itemCount}
      </span>
    </div>
  );
};

export default CartIcon;
