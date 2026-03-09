import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import FormFieldWithValidation from '@/components/checkout/FormFieldWithValidation';

interface CustomerInfoStepProps {
  formData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  formErrors: Record<string, string>;
  honeypot: string;
  onFieldChange: (field: string, value: string) => void;
  onClearError: (field: string) => void;
  onHoneypotChange: (value: string) => void;
  onNext: () => void;
}

const CustomerInfoStep = ({
  formData,
  formErrors,
  honeypot,
  onFieldChange,
  onClearError,
  onHoneypotChange,
  onNext,
}: CustomerInfoStepProps) => {
  const { t } = useTranslation('checkout');

  return (
    <fieldset className="space-y-6 animate-fade-in">
      <legend className="text-xl font-medium mb-4">
        {t('steps.information')}
      </legend>

      {/* Honeypot field - hidden from real users */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <Label htmlFor="website">Website</Label>
        <Input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => onHoneypotChange(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormFieldWithValidation
          id="firstName"
          label={t('form.firstName')}
          value={formData.firstName}
          onChange={(value) => {
            onFieldChange('firstName', value);
            onClearError('firstName');
          }}
          error={formErrors.firstName}
          placeholder={t('form.firstName')}
          required
          autoComplete="given-name"
          maxLength={50}
          validate={(value) => {
            if (value.length < 2) return t('errors.requiredField');
            if (!/^[a-zA-ZÀ-ÿ\s\-'\.]+$/.test(value))
              return t('errors.requiredField');
            return null;
          }}
        />

        <FormFieldWithValidation
          id="lastName"
          label={t('form.lastName')}
          value={formData.lastName}
          onChange={(value) => {
            onFieldChange('lastName', value);
            onClearError('lastName');
          }}
          error={formErrors.lastName}
          placeholder={t('form.lastName')}
          required
          autoComplete="family-name"
          maxLength={50}
          validate={(value) => {
            if (value.length < 2) return t('errors.requiredField');
            if (!/^[a-zA-ZÀ-ÿ\s\-'\.]+$/.test(value))
              return t('errors.requiredField');
            return null;
          }}
        />
      </div>

      <FormFieldWithValidation
        id="email"
        label={t('form.email')}
        type="email"
        value={formData.email}
        onChange={(value) => {
          onFieldChange('email', value);
          onClearError('email');
        }}
        error={formErrors.email}
        placeholder="email@example.com"
        required
        autoComplete="email"
        maxLength={254}
        validate={(value) => {
          if (!value.includes('@')) return t('errors.invalidEmail');
          if (
            !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)
          ) {
            return t('errors.invalidEmail');
          }
          return null;
        }}
      />

      <FormFieldWithValidation
        id="phone"
        label={t('form.phone')}
        type="tel"
        value={formData.phone}
        onChange={(value) => {
          onFieldChange('phone', value);
          onClearError('phone');
        }}
        error={formErrors.phone}
        placeholder="+33 6 12 34 56 78"
        autoComplete="tel"
        maxLength={20}
        showSuccessState={false}
        validate={(value) => {
          if (!value) return null;
          if (!/^[\+]?[(]?[0-9]{1,4}[)]?[-\s\./0-9]*$/.test(value)) {
            return t('errors.invalidPhone');
          }
          return null;
        }}
      />

      <Button
        className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground gap-2 min-h-[48px] text-base"
        onClick={onNext}
        aria-describedby="step1-instructions"
      >
        {t('steps.shipping')}
        <ArrowRight className="h-4 w-4" />
      </Button>
      <p id="step1-instructions" className="sr-only">
        {t('steps.shipping')}
      </p>
    </fieldset>
  );
};

export default CustomerInfoStep;
