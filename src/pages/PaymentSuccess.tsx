import { CheckCircle, ShoppingBag, Home, Loader2, Mail } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

import PageFooter from "@/components/PageFooter";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/stores";
import { useAuth } from "@/context/AuthContext";

interface CustomerInfo {
  firstName: string;
  lastName: string;
  email: string;
}

const PaymentSuccess = () => {
  const { t } = useTranslation(['pages', 'common']);
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const isPayPal = searchParams.get('paypal') === 'true';
  const paypalOrderId = searchParams.get('token'); // PayPal returns the order ID as 'token'
  const orderId = searchParams.get('order_id');
  
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    message: string;
    orderId?: string;
    transactionId?: string;
  } | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const { clearCart } = useCart();
  const { user, profile } = useAuth();

  useEffect(() => {
    const verifyPayment = async () => {
      // Determine payment type and verify accordingly
      if (isPayPal && paypalOrderId && orderId) {
        // PayPal payment verification
        try {
          console.log("Verifying PayPal payment:", { paypalOrderId, orderId });
          
          const { data, error } = await supabase.functions.invoke('verify-paypal-payment', {
            body: { 
              paypal_order_id: paypalOrderId,
              order_id: orderId
            }
          });

          if (error) {
            console.error("PayPal verification error:", error);
            setVerificationResult({
              success: false,
              message: t('pages:paymentSuccess.errors.verificationError')
            });
            toast.error(t('pages:paymentSuccess.errors.verificationError'));
          } else if (data?.success) {
            console.log("PayPal payment verified:", data);
            setVerificationResult({
              success: true,
              message: data.message || t('pages:paymentSuccess.success.verified'),
              orderId: data.order_id || orderId,
              transactionId: data.transaction_id
            });
            
            // Set customer info from user profile
            if (profile || user) {
              const nameParts = (profile?.full_name || '').split(' ');
              setCustomerInfo({
                firstName: nameParts[0] || '',
                lastName: nameParts.slice(1).join(' ') || '',
                email: user?.email || ''
              });
            }
            
            clearCart();
            localStorage.removeItem('cart');
            toast.success(t('pages:paymentSuccess.success.confirmed'));
          } else {
            console.log("PayPal verification failed:", data);
            setVerificationResult({
              success: false,
              message: data?.message || t('pages:paymentSuccess.errors.verificationFailed')
            });
            toast.error(data?.message || t('pages:paymentSuccess.errors.verificationFailed'));
          }
        } catch (error) {
          console.error("Unexpected PayPal error:", error);
          setVerificationResult({
            success: false,
            message: t('pages:paymentSuccess.errors.unexpectedError')
          });
          toast.error(t('pages:paymentSuccess.errors.unexpectedError'));
        } finally {
          setIsVerifying(false);
        }
      } else if (sessionId) {
        // Stripe payment verification
        try {
          console.log("Verifying Stripe payment for session:", sessionId);
          
          const { data, error } = await supabase.functions.invoke('verify-payment', {
            body: { session_id: sessionId }
          });

          if (error) {
            console.error("Verification error:", error);
            setVerificationResult({
              success: false,
              message: t('pages:paymentSuccess.errors.verificationError')
            });
            toast.error(t('pages:paymentSuccess.errors.verificationError'));
          } else if (data?.success) {
            console.log("Payment verified successfully:", data);
            setVerificationResult({
              success: true,
              message: data.message || t('pages:paymentSuccess.success.verified'),
              orderId: data.orderId,
              transactionId: sessionId.slice(-8).toUpperCase()
            });
            
            if (data.customerInfo) {
              setCustomerInfo(data.customerInfo);
            } else if (profile || user) {
              const nameParts = (profile?.full_name || '').split(' ');
              setCustomerInfo({
                firstName: nameParts[0] || '',
                lastName: nameParts.slice(1).join(' ') || '',
                email: user?.email || ''
              });
            }
            
            clearCart();
            localStorage.removeItem('cart');
            toast.success(t('pages:paymentSuccess.success.confirmed'));
          } else {
            console.log("Payment verification failed:", data);
            setVerificationResult({
              success: false,
              message: data?.message || t('pages:paymentSuccess.errors.verificationFailed')
            });
            toast.error(data?.message || t('pages:paymentSuccess.errors.verificationFailed'));
          }
        } catch (error) {
          console.error("Unexpected error during verification:", error);
          setVerificationResult({
            success: false,
            message: t('pages:paymentSuccess.errors.unexpectedError')
          });
          toast.error(t('pages:paymentSuccess.errors.unexpectedError'));
        } finally {
          setIsVerifying(false);
        }
      } else {
        // No valid payment info
        setVerificationResult({
          success: false,
          message: t('pages:paymentSuccess.errors.missingSession')
        });
        setIsVerifying(false);
      }
    };

    verifyPayment();
  }, [sessionId, isPayPal, paypalOrderId, orderId, clearCart, t, profile, user]);

  // Build contact URL with customer info pre-filled
  const getContactUrl = () => {
    if (!customerInfo) return '/contact';
    const params = new URLSearchParams();
    if (customerInfo.firstName) params.set('firstName', customerInfo.firstName);
    if (customerInfo.lastName) params.set('lastName', customerInfo.lastName);
    if (customerInfo.email) params.set('email', customerInfo.email);
    if (verificationResult?.orderId) params.set('orderId', verificationResult.orderId);
    return `/contact?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-background">
      
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8">
            {isVerifying ? (
              <>
                <Loader2 className="w-20 h-20 text-primary mx-auto mb-4 animate-spin" />
                <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-4">
                  {t('pages:paymentSuccess.verifying.title')}
                </h1>
                <p className="text-lg text-muted-foreground mb-2">
                  {t('pages:paymentSuccess.verifying.description')}
                </p>
              </>
            ) : verificationResult?.success ? (
              <>
                <CheckCircle className="w-20 h-20 text-green-600 dark:text-green-400 mx-auto mb-4" />
                <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-4">
                  {t('pages:paymentSuccess.success.title')}
                </h1>
                <p className="text-lg text-muted-foreground mb-2">
                  {t('pages:paymentSuccess.success.thanks')} {verificationResult.message}
                </p>
                {verificationResult.transactionId && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {t('pages:paymentSuccess.success.transactionId')}: {verificationResult.transactionId.slice(-8).toUpperCase()}
                  </p>
                )}
                {verificationResult.orderId && (
                  <p className="text-sm text-muted-foreground mb-6">
                    {t('pages:paymentSuccess.success.orderId')}: {verificationResult.orderId.slice(-8).toUpperCase()}
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-4">
                  {t('pages:paymentSuccess.error.title')}
                </h1>
                <p className="text-lg text-muted-foreground mb-6">
                  {verificationResult?.message || t('pages:paymentSuccess.error.description')}
                </p>
              </>
            )}
          </div>

          <div className="bg-muted rounded-lg p-8 mb-8">
            <h2 className="text-xl font-medium text-foreground mb-4">
              {t('pages:paymentSuccess.nextSteps.title')}
            </h2>
            <div className="space-y-3 text-left max-w-md mx-auto">
              <div className="flex items-start">
                <div className="w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-1">
                  1
                </div>
                <div>
                  <p className="text-foreground font-medium">{t('pages:paymentSuccess.nextSteps.step1.title')}</p>
                  <p className="text-sm text-muted-foreground">{t('pages:paymentSuccess.nextSteps.step1.description')}</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-1">
                  2
                </div>
                <div>
                  <p className="text-foreground font-medium">{t('pages:paymentSuccess.nextSteps.step2.title')}</p>
                  <p className="text-sm text-muted-foreground">{t('pages:paymentSuccess.nextSteps.step2.description')}</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-1">
                  3
                </div>
                <div>
                  <p className="text-foreground font-medium">{t('pages:paymentSuccess.nextSteps.step3.title')}</p>
                  <p className="text-sm text-muted-foreground">{t('pages:paymentSuccess.nextSteps.step3.description')}</p>
                </div>
              </div>
            </div>
          </div>

          {!isVerifying && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild className="bg-primary hover:bg-primary/90">
                <Link to="/products" className="flex items-center">
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  {t('common:buttons.continueShopping')}
                </Link>
              </Button>
              
              <Button variant="outline" asChild>
                <Link to="/" className="flex items-center">
                  <Home className="w-4 h-4 mr-2" />
                  {t('common:buttons.backToHome')}
                </Link>
              </Button>
            </div>
          )}

          <div className="mt-12 p-6 bg-primary/10 rounded-lg">
            <h3 className="text-lg font-medium text-foreground mb-2">
              {t('pages:paymentSuccess.help.title')}
            </h3>
            <p className="text-muted-foreground mb-4">
              {t('pages:paymentSuccess.help.description')}
            </p>
            <Button variant="outline" asChild>
              <Link to={getContactUrl()} className="flex items-center">
                <Mail className="w-4 h-4 mr-2" />
                {t('common:nav.contact')}
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <PageFooter />
    </div>
  );
};

export default PaymentSuccess;