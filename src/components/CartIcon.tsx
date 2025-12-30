import { ShoppingBag, Loader2, WifiOff, CloudOff } from "lucide-react";
import clsx from "clsx";
import { useCartUI } from "@/context/useCartUI";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Icône de panier avec badge dynamique et indicateur de synchronisation.
 */
const CartIcon = () => {
  const { itemCount, cartColor, badgeTextColor, isSyncing, isOnline, pendingOperations } = useCartUI();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={clsx(
              "relative p-2 rounded-full transition-colors duration-200",
              cartColor
            )}
            aria-label={`Panier (${itemCount})`}
          >
            <ShoppingBag className="text-primary-foreground" />
            
            {/* Item count badge */}
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

            {/* Sync indicator */}
            {isSyncing && (
              <span className="absolute -bottom-1 -right-1 bg-primary rounded-full p-0.5">
                <Loader2 className="h-3 w-3 text-primary-foreground animate-spin" />
              </span>
            )}

            {/* Offline indicator with pending operations */}
            {!isOnline && !isSyncing && (
              <span className="absolute -bottom-1 -right-1 bg-warning rounded-full p-0.5">
                <WifiOff className="h-3 w-3 text-warning-foreground" />
              </span>
            )}

            {/* Pending sync indicator (online but has queued operations) */}
            {isOnline && !isSyncing && pendingOperations > 0 && (
              <span className="absolute -bottom-1 -right-1 bg-accent rounded-full p-0.5 flex items-center justify-center">
                <CloudOff className="h-3 w-3 text-accent-foreground" />
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {isSyncing ? (
            <span className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Synchronisation en cours...
            </span>
          ) : !isOnline ? (
            <span className="flex items-center gap-1">
              <WifiOff className="h-3 w-3" />
              Mode hors-ligne
              {pendingOperations > 0 && ` (${pendingOperations} en attente)`}
            </span>
          ) : pendingOperations > 0 ? (
            <span>{pendingOperations} modification(s) en attente</span>
          ) : (
            <span>Panier ({itemCount} article{itemCount !== 1 ? 's' : ''})</span>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default CartIcon;