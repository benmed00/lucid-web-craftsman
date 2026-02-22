import { useState, useEffect } from 'react';
import { CreditCard, Smartphone, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface MobilePaymentButtonsProps {
  amount: number;
  currency?: string;
  onPaymentSuccess: (paymentMethod: string) => void;
  onPaymentError: (error: string) => void;
  disabled?: boolean;
}

export const MobilePaymentButtons = ({
  amount,
  currency = 'EUR',
  onPaymentSuccess,
  onPaymentError,
  disabled = false
}: MobilePaymentButtonsProps) => {
  const [isApplePayAvailable, setIsApplePayAvailable] = useState(false);
  const [isGooglePayAvailable, setIsGooglePayAvailable] = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  useEffect(() => {
    // Check Apple Pay availability
    if ((window as any).ApplePaySession && (window as any).ApplePaySession.canMakePayments()) {
      setIsApplePayAvailable(true);
    }

    // Check Google Pay availability
    if ((window as any).google?.payments?.api) {
      const paymentsClient = new (window as any).google.payments.api.PaymentsClient({
        environment: 'TEST' // Change to 'PRODUCTION' for live
      });

      paymentsClient.isReadyToPay({
        apiVersion: 2,
        apiVersionMinor: 0,
        allowedPaymentMethods: [{
          type: 'CARD',
          parameters: {
            allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
            allowedCardNetworks: ['MASTERCARD', 'VISA']
          }
        }]
      }).then(response => {
        if (response.result) {
          setIsGooglePayAvailable(true);
        }
      }).catch(console.error);
    }
  }, []);

  const handleApplePay = async () => {
    if (!isApplePayAvailable || disabled) return;

    setIsProcessing('apple');

    try {
      const paymentRequest = {
        countryCode: 'FR',
        currencyCode: currency,
        supportedNetworks: ['visa', 'masterCard', 'amex'],
        merchantCapabilities: ['supports3DS'],
        total: {
          label: 'Rif Raw Straw',
          amount: amount.toString()
        }
      };

      const session = new ApplePaySession(3, paymentRequest);
      
      session.onvalidatemerchant = async (event) => {
        // In production, validate merchant with your server
        // Merchant validation handled silently
      };

      session.onpaymentauthorized = (event) => {
        // Process payment with your backend
        // Payment processing handled silently
        
        // Simulate successful payment
        setTimeout(() => {
          session.completePayment(ApplePaySession.STATUS_SUCCESS);
          onPaymentSuccess('apple_pay');
          setIsProcessing(null);
        }, 1000);
      };

      session.begin();
    } catch (error) {
      // Handle error gracefully
      onPaymentError('Erreur Apple Pay: ' + (error as Error).message);
      setIsProcessing(null);
    }
  };

  const handleGooglePay = async () => {
    if (!isGooglePayAvailable || disabled) return;

    setIsProcessing('google');

    try {
      const paymentsClient = new google.payments.api.PaymentsClient({
        environment: 'TEST'
      });

      const paymentDataRequest = {
        apiVersion: 2,
        apiVersionMinor: 0,
        allowedPaymentMethods: [{
          type: 'CARD',
          parameters: {
            allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
            allowedCardNetworks: ['MASTERCARD', 'VISA']
          },
          tokenizationSpecification: {
            type: 'PAYMENT_GATEWAY',
            parameters: {
              gateway: 'stripe', // Your payment gateway
              gatewayMerchantId: 'your-merchant-id'
            }
          }
        }],
        transactionInfo: {
          totalPriceStatus: 'FINAL',
          totalPrice: amount.toString(),
          currencyCode: currency
        },
        merchantInfo: {
          merchantName: 'Rif Raw Straw',
          merchantId: 'your-merchant-id'
        }
      };

      const paymentData = await paymentsClient.loadPaymentData(paymentDataRequest);
      
      // Process payment data with your backend
      // Payment data processing handled silently
      
      // Simulate successful payment
      setTimeout(() => {
        onPaymentSuccess('google_pay');
        setIsProcessing(null);
      }, 1000);

    } catch (error) {
      // Handle error gracefully
      onPaymentError('Erreur Google Pay: ' + (error as Error).message);
      setIsProcessing(null);
    }
  };

  if (!isApplePayAvailable && !isGooglePayAvailable) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Paiement express</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {/* Apple Pay Button */}
        {isApplePayAvailable && (
          <Button
            onClick={handleApplePay}
            disabled={disabled || isProcessing !== null}
            className="relative h-12 bg-foreground hover:bg-foreground/90 text-background font-medium rounded-md transition-all duration-200 disabled:opacity-50"
          >
            {isProcessing === 'apple' ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold">Pay</span>
                  <div className="text-white">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                  </div>
                </div>
              </>
            )}
          </Button>
        )}

        {/* Google Pay Button */}
        {isGooglePayAvailable && (
          <Button
            onClick={handleGooglePay}
            disabled={disabled || isProcessing !== null}
            className="relative h-12 bg-card hover:bg-muted border border-border text-foreground font-medium rounded-md transition-all duration-200 disabled:opacity-50"
          >
            {isProcessing === 'google' ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <div className="flex items-center space-x-2">
                  <svg width="24" height="24" viewBox="0 0 24 24">
                    <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Pay</span>
                </div>
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};