import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/stores/currencyStore";

interface PaymentButtonProps {
  total: number;
  isProcessing: boolean;
  onClick: () => void;
  disabled?: boolean;
}

const PaymentButton = ({ total, isProcessing, onClick, disabled }: PaymentButtonProps) => {
  const { formatPrice } = useCurrency();
  
  return (
    <div className="space-y-4">
      <Button
        className={cn(
          "w-full h-14 text-lg font-medium transition-all duration-300",
          "bg-primary hover:bg-primary/90 text-primary-foreground",
          "shadow-lg hover:shadow-xl",
          isProcessing && "cursor-wait"
        )}
        onClick={onClick}
        disabled={isProcessing || disabled}
      >
        {isProcessing ? (
          <span className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin" />
            Traitement en cours...
          </span>
        ) : (
          <span className="flex items-center gap-3">
            <Lock className="h-5 w-5" />
            Payer {formatPrice(total)}
          </span>
        )}
      </Button>

      {/* Security badges */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <ShieldCheck className="h-4 w-4 text-primary" />
          SSL 256-bit
        </span>
        <span className="flex items-center gap-1">
          <Lock className="h-4 w-4 text-primary" />
          Paiement sécurisé
        </span>
      </div>

      {/* Payment logos */}
      <div className="flex items-center justify-center gap-3 opacity-60">
        <div className="text-xs font-medium px-2 py-1 bg-muted rounded">VISA</div>
        <div className="text-xs font-medium px-2 py-1 bg-muted rounded">Mastercard</div>
        <div className="text-xs font-medium px-2 py-1 bg-muted rounded">AMEX</div>
      </div>
    </div>
  );
};

export default PaymentButton;
