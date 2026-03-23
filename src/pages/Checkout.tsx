import { ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import PageFooter from '@/components/PageFooter';
import SEOHelmet from '@/components/seo/SEOHelmet';
import CheckoutProgress from '@/components/checkout/CheckoutProgress';
import CustomerInfoStep from '@/components/checkout/CustomerInfoStep';
import ShippingStep from '@/components/checkout/ShippingStep';
import PaymentStep from '@/components/checkout/PaymentStep';
import CheckoutOrderSummary from '@/components/checkout/CheckoutOrderSummary';

import { useCheckoutPage } from '@/hooks/useCheckoutPage';

const Checkout = () => {
  const c = useCheckoutPage();

  // Empty cart
  if (c.cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <SEOHelmet
          title={c.t('payment.title') + ' - Rif Raw Straw'}
          description={c.t('payment.securePayment')}
          keywords={['paiement', 'checkout', 'commande sécurisée']}
          url="/checkout"
          type="website"
        />
        <div className="container mx-auto px-4 py-16">
          <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-8 text-center">
            {c.t('payment.title')}
          </h1>
          <div className="text-center">
            <p className="text-muted-foreground">{c.t('cart.empty')}</p>
            <Button
              className="mt-4"
              onClick={() => (window.location.href = '/products')}
            >
              {c.t('cart.continueShopping')}
            </Button>
          </div>
        </div>
        <PageFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <SEOHelmet
        title={c.t('payment.title') + ' - Rif Raw Straw'}
        description={c.t('payment.securePayment')}
        keywords={[
          'paiement sécurisé',
          'checkout',
          'commande',
          'artisanat berbère',
        ]}
        url="/checkout"
        type="website"
      />

      <div className="container mx-auto px-4 py-6 md:py-10 pb-28 md:pb-12">
        {/* Header */}
        <div className="text-center mb-2">
          <h1 className="font-serif text-2xl md:text-3xl lg:text-4xl text-foreground">
            {c.t('payment.title')}
          </h1>
        </div>

        <CheckoutProgress
          currentStep={c.step}
          completedSteps={c.completedSteps}
          onStepClick={c.handleEditStep}
        />

        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 lg:gap-12">
            {/* Form Section */}
            <div className="lg:col-span-2">
              {(c.isFormLoading || !c.hasRestoredState) && (
                <div className="space-y-6 animate-fade-in bg-card rounded-xl p-6 border border-border shadow-sm">
                  <Skeleton className="h-8 w-48" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <Skeleton className="h-12 w-48" />
                </div>
              )}

              {!c.isFormLoading && c.hasRestoredState && c.step === 1 && (
                <div className="bg-card rounded-xl p-6 md:p-8 border border-border shadow-sm">
                  <CustomerInfoStep
                    formData={c.formData}
                    formErrors={c.formErrors}
                    honeypot={c.honeypot}
                    onFieldChange={c.handleFieldChange}
                    onClearError={c.handleClearError}
                    onHoneypotChange={c.setHoneypot}
                    onNext={c.goToNextStep}
                  />
                </div>
              )}

              {!c.isFormLoading && c.hasRestoredState && c.step === 2 && (
                <div className="bg-card rounded-xl p-6 md:p-8 border border-border shadow-sm">
                  <ShippingStep
                    formData={c.formData}
                    formErrors={c.formErrors}
                    onFieldChange={c.handleFieldChange}
                    onClearError={c.handleClearError}
                    onInputChange={c.handleInputChange}
                    onNext={c.goToNextStep}
                    onEditStep={c.handleEditStep}
                  />
                </div>
              )}

              {!c.isFormLoading && c.hasRestoredState && c.step === 3 && (
                <div className="bg-card rounded-xl p-6 md:p-8 border border-border shadow-sm">
                  <PaymentStep
                    formData={c.formData}
                    paymentMethod={c.paymentMethod}
                    total={c.total}
                    isProcessing={c.isProcessing}
                    onPaymentMethodChange={c.setPaymentMethod}
                    onPayment={c.handlePayment}
                    onEditStep={c.handleEditStep}
                  />
                </div>
              )}
            </div>

            {/* Order Summary */}
            <CheckoutOrderSummary
              cartItems={c.cartItems}
              subtotal={c.subtotal}
              discount={c.discount}
              shipping={c.shipping}
              total={c.total}
              hasFreeShipping={c.hasFreeShipping}
              shippingCost={c.shippingCost}
              freeShippingSettings={c.freeShippingSettings}
              appliedCoupon={c.appliedCoupon}
              promoCode={c.promoCode}
              promoError={c.promoError}
              isValidatingPromo={c.isValidatingPromo}
              onPromoCodeChange={(code) => {
                c.setPromoCode(code);
                c.setPromoError('');
              }}
              onValidatePromo={c.handleValidatePromoCode}
              onRemovePromo={c.removePromoCode}
            />
          </div>
        </div>

        {/* Security footer */}
        <div className="max-w-6xl mx-auto mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span>
            Paiement sécurisé par Stripe — Vos données sont chiffrées en SSL
            256-bit
          </span>
        </div>
      </div>

      {/* Mobile sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border p-3 px-4 md:hidden safe-area z-50 shadow-lg">
        <div className="flex items-center justify-between gap-2">
          {c.step > 1 ? (
            <Button
              variant="outline"
              className="flex-1 min-h-[48px] text-xs px-2"
              onClick={() => c.handleEditStep(c.step - 1)}
            >
              <ArrowLeft className="h-4 w-4 mr-1 flex-shrink-0" />
              <span className="truncate">
                {c.t('cart.continueShopping').split(' ')[0]}
              </span>
            </Button>
          ) : (
            <Button
              variant="outline"
              className="flex-1 min-h-[48px] text-xs px-2"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-1 flex-shrink-0" />
              <span className="truncate">{c.t('cart.title')}</span>
            </Button>
          )}

          {c.step < 3 ? (
            <Button
              data-testid="checkout-mobile-next"
              className="flex-[1.3] min-h-[48px] bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs px-2"
              onClick={c.goToNextStep}
            >
              <span className="truncate">{c.t('cart.proceedToCheckout')}</span>
              <ArrowRight className="h-4 w-4 ml-1 flex-shrink-0" />
            </Button>
          ) : (
            <Button
              className="flex-[1.3] min-h-[48px] bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs px-2"
              onClick={c.handlePayment}
              disabled={c.isProcessing}
            >
              <span className="truncate">
                {c.isProcessing
                  ? c.t('payment.processing')
                  : c.t('payment.payNow') + ` ${c.formatPrice(c.total)}`}
              </span>
            </Button>
          )}
        </div>
      </div>

      <PageFooter />
    </div>
  );
};

export default Checkout;
