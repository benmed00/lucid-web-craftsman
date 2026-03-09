import { ArrowLeft, CreditCard } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import StepSummary from '@/components/checkout/StepSummary';
import PaymentButton from '@/components/checkout/PaymentButton';

interface PaymentStepProps {
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
  paymentMethod: string;
  total: number;
  isProcessing: boolean;
  onPaymentMethodChange: (method: string) => void;
  onPayment: () => void;
  onEditStep: (step: number) => void;
}

const PaymentStep = ({
  formData,
  paymentMethod,
  total,
  isProcessing,
  onPaymentMethodChange,
  onPayment,
  onEditStep,
}: PaymentStepProps) => {
  const { t } = useTranslation('checkout');

  const customerData = {
    firstName: formData.firstName,
    lastName: formData.lastName,
    email: formData.email,
    phone: formData.phone,
  };

  const shippingData = {
    address: formData.address,
    addressComplement: formData.addressComplement,
    postalCode: formData.postalCode,
    city: formData.city,
    country: formData.country,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <StepSummary
        step={3}
        customerData={customerData}
        shippingData={shippingData}
        onEditStep={onEditStep}
      />

      <div className="flex items-center mb-2">
        <button
          className="text-primary hover:text-primary/80 flex items-center text-sm"
          onClick={() => onEditStep(2)}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />{' '}
          {t('cart.continueShopping').split(' ')[0]}
        </button>
        <h2 className="text-xl font-medium ml-4">{t('payment.title')}</h2>
      </div>

      <RadioGroup
        value={paymentMethod}
        onValueChange={onPaymentMethodChange}
        className="space-y-4"
      >
        <div
          className={`border rounded-lg p-4 transition-all cursor-pointer ${
            paymentMethod === 'card'
              ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
              : 'border-border hover:border-primary/50'
          }`}
          onClick={() => onPaymentMethodChange('card')}
        >
          <div className="flex items-start">
            <RadioGroupItem value="card" id="card" className="mt-1" />
            <div className="ml-3 flex-1">
              <Label
                htmlFor="card"
                className="text-lg flex items-center cursor-pointer"
              >
                <CreditCard className="mr-2 h-5 w-5" /> {t('payment.payNow')}
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Visa, Mastercard, American Express
              </p>
              {paymentMethod === 'card' && (
                <p className="text-xs text-primary mt-2 animate-fade-in">
                  {t('payment.redirecting')}
                </p>
              )}
            </div>
          </div>
        </div>

        <div
          className={`border rounded-lg p-4 transition-all cursor-pointer ${
            paymentMethod === 'paypal'
              ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
              : 'border-border hover:border-primary/50'
          }`}
          onClick={() => onPaymentMethodChange('paypal')}
        >
          <div className="flex items-center">
            <RadioGroupItem value="paypal" id="paypal" />
            <Label htmlFor="paypal" className="ml-3 text-lg cursor-pointer">
              PayPal
            </Label>
          </div>
        </div>
      </RadioGroup>

      <PaymentButton
        total={total}
        isProcessing={isProcessing}
        onClick={onPayment}
      />
    </div>
  );
};

export default PaymentStep;
