import { ArrowLeft, ArrowRight, AlertCircle, Truck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import FormFieldWithValidation from '@/components/checkout/FormFieldWithValidation';
import StepSummary from '@/components/checkout/StepSummary';

interface ShippingStepProps {
  formData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    addressComplement: string;
    postalCode: string;
    city: string;
    country: string;
  };
  formErrors: Record<string, string>;
  onFieldChange: (field: string, value: string) => void;
  onClearError: (field: string) => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onNext: () => void;
  onEditStep: (step: number) => void;
}

const ShippingStep = ({
  formData,
  formErrors,
  onFieldChange,
  onClearError,
  onInputChange,
  onNext,
  onEditStep,
}: ShippingStepProps) => {
  const { t } = useTranslation('checkout');

  const customerData = {
    firstName: formData.firstName,
    lastName: formData.lastName,
    email: formData.email,
    phone: formData.phone,
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <StepSummary
        step={2}
        customerData={customerData}
        onEditStep={onEditStep}
      />

      <div className="flex items-center gap-3 mb-2">
        <button
          className="text-primary hover:text-primary/80 flex items-center text-sm font-medium transition-colors"
          onClick={() => onEditStep(1)}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t('cart.continueShopping').split(' ')[0]}
        </button>
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">{t('shipping.title')}</h2>
        </div>
      </div>

      <FormFieldWithValidation
        id="address"
        label={t('form.address')}
        value={formData.address}
        onChange={(value) => {
          onFieldChange('address', value);
          onClearError('address');
        }}
        error={formErrors.address}
        placeholder={t('form.address')}
        required
        autoComplete="street-address"
        maxLength={200}
        validate={(value) => {
          if (value.length < 5) return t('errors.requiredField');
          return null;
        }}
      />

      <FormFieldWithValidation
        id="addressComplement"
        label={t('form.addressLine2')}
        value={formData.addressComplement}
        onChange={(value) => {
          onFieldChange('addressComplement', value);
          onClearError('addressComplement');
        }}
        error={formErrors.addressComplement}
        placeholder={t('form.addressLine2')}
        autoComplete="address-line2"
        maxLength={100}
        showSuccessState={false}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <FormFieldWithValidation
            id="postalCode"
            label={t('form.postalCode')}
            value={formData.postalCode}
            onChange={(value) => {
              onFieldChange('postalCode', value);
              onClearError('postalCode');
            }}
            error={formErrors.postalCode}
            placeholder={
              formData.country === 'BE' || formData.country === 'CH' || formData.country === 'LU'
                ? '1000'
                : 'ex: 75001'
            }
            required
            autoComplete="postal-code"
            maxLength={10}
            validate={(value) => {
              const countryPatterns: Record<string, RegExp> = {
                FR: /^\d{5}$/,
                BE: /^\d{4}$/,
                CH: /^\d{4}$/,
                MC: /^\d{5}$/,
                LU: /^\d{4}$/,
              };
              const pattern = countryPatterns[formData.country];
              if (pattern && !pattern.test(value)) {
                return t('errors.invalidPostalCode');
              }
              return null;
            }}
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            {formData.country === 'FR' || formData.country === 'MC'
              ? '5 chiffres (ex: 75001)'
              : formData.country === 'BE' || formData.country === 'LU'
                ? '4 chiffres (ex: 1000)'
                : formData.country === 'CH'
                  ? '4 chiffres (ex: 1200)'
                  : ''}
          </p>
        </div>

        <div className="md:col-span-2">
          <FormFieldWithValidation
            id="city"
            label={t('form.city')}
            value={formData.city}
            onChange={(value) => {
              onFieldChange('city', value);
              onClearError('city');
            }}
            error={formErrors.city}
            placeholder={t('form.city')}
            required
            autoComplete="address-level2"
            maxLength={100}
            validate={(value) => {
              if (value.length < 2) return t('errors.requiredField');
              if (!/^[a-zA-ZÀ-ÿ\s\-'\.]+$/.test(value)) return t('errors.requiredField');
              return null;
            }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="country" className="text-sm font-medium">
          {t('form.country')} <span className="text-destructive">*</span>
        </Label>
        <select
          id="country"
          className={`w-full h-10 px-3 py-2 border bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm ${
            formErrors.country ? 'border-destructive' : 'border-border'
          }`}
          value={formData.country}
          onChange={onInputChange}
        >
          <option value="FR">🇫🇷 France</option>
          <option value="BE">🇧🇪 Belgique</option>
          <option value="CH">🇨🇭 Suisse</option>
          <option value="MC">🇲🇨 Monaco</option>
          <option value="LU">🇱🇺 Luxembourg</option>
        </select>
        {formErrors.country && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {formErrors.country}
          </p>
        )}
      </div>

      <Button
        className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground gap-2 min-h-[48px] text-base font-medium shadow-sm"
        onClick={onNext}
      >
        {t('steps.payment')}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default ShippingStep;
