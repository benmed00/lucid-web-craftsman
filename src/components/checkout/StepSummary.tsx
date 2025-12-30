import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CustomerData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface ShippingData {
  address: string;
  addressComplement: string;
  postalCode: string;
  city: string;
  country: string;
}

interface StepSummaryProps {
  step: number;
  customerData?: CustomerData;
  shippingData?: ShippingData;
  onEditStep: (step: number) => void;
}

const COUNTRY_NAMES: Record<string, string> = {
  FR: "France",
  BE: "Belgique",
  CH: "Suisse",
  MC: "Monaco",
  LU: "Luxembourg",
};

const StepSummary = ({ step, customerData, shippingData, onEditStep }: StepSummaryProps) => {
  // Show customer info summary in step 2 and 3
  const showCustomerSummary = step >= 2 && customerData;
  // Show shipping summary in step 3
  const showShippingSummary = step >= 3 && shippingData;

  if (!showCustomerSummary && !showShippingSummary) {
    return null;
  }

  return (
    <div className="space-y-3 mb-6">
      {showCustomerSummary && (
        <div className="bg-muted/50 rounded-lg p-4 border border-border/50">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Coordonnées
              </p>
              <p className="font-medium text-sm">
                {customerData.firstName} {customerData.lastName}
              </p>
              <p className="text-sm text-muted-foreground">{customerData.email}</p>
              {customerData.phone && (
                <p className="text-sm text-muted-foreground">{customerData.phone}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary hover:text-primary/80 -mt-1 -mr-2"
              onClick={() => onEditStep(1)}
            >
              <Pencil className="h-3 w-3 mr-1" />
              Modifier
            </Button>
          </div>
        </div>
      )}

      {showShippingSummary && (
        <div className="bg-muted/50 rounded-lg p-4 border border-border/50">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Adresse de livraison
              </p>
              <p className="font-medium text-sm">{shippingData.address}</p>
              {shippingData.addressComplement && (
                <p className="text-sm text-muted-foreground">
                  {shippingData.addressComplement}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                {shippingData.postalCode} {shippingData.city}, {COUNTRY_NAMES[shippingData.country] || shippingData.country}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary hover:text-primary/80 -mt-1 -mr-2"
              onClick={() => onEditStep(2)}
            >
              <Pencil className="h-3 w-3 mr-1" />
              Modifier
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StepSummary;
