import { Pencil, User, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import {
  isValidPersonalInfo,
  isValidShippingInfo,
} from '@/utils/checkoutSessionValidation';

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
  FR: 'France',
  BE: 'Belgique',
  CH: 'Suisse',
  MC: 'Monaco',
  LU: 'Luxembourg',
};

const StepSummary = ({
  step,
  customerData,
  shippingData,
  onEditStep,
}: StepSummaryProps) => {
  const { t } = useTranslation('checkout');

  // Validate data before displaying — never show empty/placeholder summaries
  const hasValidCustomer =
    step >= 2 && customerData && isValidPersonalInfo(customerData);
  const hasValidShipping =
    step >= 3 && shippingData && isValidShippingInfo(shippingData);

  if (!hasValidCustomer && !hasValidShipping) {
    return null;
  }

  return (
    <div className="space-y-3 mb-6">
      {hasValidCustomer && customerData && (
        <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {t('steps.summary.contact')}
                </p>
                <p className="font-medium text-sm text-foreground">
                  {customerData.firstName} {customerData.lastName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {customerData.email}
                </p>
                {customerData.phone && (
                  <p className="text-sm text-muted-foreground">
                    {customerData.phone}
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary hover:text-primary/80 hover:bg-primary/5 -mt-1 -mr-2"
              onClick={() => onEditStep(1)}
            >
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              {t('steps.summary.edit')}
            </Button>
          </div>
        </div>
      )}

      {hasValidShipping && shippingData && (
        <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {t('steps.summary.shippingAddress')}
                </p>
                <p className="font-medium text-sm text-foreground">
                  {shippingData.address}
                </p>
                {shippingData.addressComplement && (
                  <p className="text-sm text-muted-foreground">
                    {shippingData.addressComplement}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  {shippingData.postalCode} {shippingData.city},{' '}
                  {COUNTRY_NAMES[shippingData.country] || shippingData.country}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary hover:text-primary/80 hover:bg-primary/5 -mt-1 -mr-2"
              onClick={() => onEditStep(2)}
            >
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              {t('steps.summary.edit')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StepSummary;
