import { CheckCircle, ShoppingBag, Home, Loader2, Mail, Download } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
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

interface OrderItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface InvoiceData {
  orderId: string;
  date: string;
  customer: CustomerInfo;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
}

const PaymentSuccess = () => {
  const { t } = useTranslation(['pages', 'common']);
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const isPayPal = searchParams.get('paypal') === 'true';
  const paypalOrderId = searchParams.get('token');
  const orderId = searchParams.get('order_id');
  
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    message: string;
    orderId?: string;
    transactionId?: string;
  } | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const { clearCart } = useCart();
  const { user, profile } = useAuth();

  // Build invoice data from verify-payment response
  const buildInvoiceFromResponse = useCallback((responseInvoice: any, fetchedOrderId: string, customer: CustomerInfo) => {
    if (!responseInvoice?.items) return;
    setInvoiceData({
      orderId: fetchedOrderId,
      date: new Date(responseInvoice.date || Date.now()).toLocaleDateString('fr-FR'),
      customer,
      items: responseInvoice.items,
      subtotal: responseInvoice.subtotal || 0,
      shipping: responseInvoice.shipping || 0,
      discount: 0,
      total: responseInvoice.total || 0,
    });
  }, []);

  useEffect(() => {
    const verifyPayment = async () => {
      if (isPayPal && paypalOrderId && orderId) {
        try {
          const { data, error } = await supabase.functions.invoke('verify-paypal-payment', {
            body: { paypal_order_id: paypalOrderId, order_id: orderId }
          });

          if (error) {
            setVerificationResult({ success: false, message: t('pages:paymentSuccess.errors.verificationError') });
          } else if (data?.success) {
            const finalOrderId = data.order_id || orderId;
            setVerificationResult({
              success: true,
              message: data.message || t('pages:paymentSuccess.success.verified'),
              orderId: finalOrderId,
              transactionId: data.transaction_id,
            });
            const cust = { firstName: '', lastName: '', email: '' };
            if (profile || user) {
              const nameParts = (profile?.full_name || '').split(' ');
              cust.firstName = nameParts[0] || '';
              cust.lastName = nameParts.slice(1).join(' ') || '';
              cust.email = user?.email || '';
            }
            setCustomerInfo(cust);
            if (data.invoiceData) buildInvoiceFromResponse(data.invoiceData, finalOrderId, cust);
            clearCart();
            localStorage.removeItem('cart');
            toast.success(t('pages:paymentSuccess.success.confirmed'));
          } else {
            setVerificationResult({ success: false, message: data?.message || t('pages:paymentSuccess.errors.verificationFailed') });
          }
        } catch {
          setVerificationResult({ success: false, message: t('pages:paymentSuccess.errors.unexpectedError') });
        } finally {
          setIsVerifying(false);
        }
      } else if (sessionId) {
        try {
          const { data, error } = await supabase.functions.invoke('verify-payment', {
            body: { session_id: sessionId }
          });

          if (error) {
            setVerificationResult({ success: false, message: t('pages:paymentSuccess.errors.verificationError') });
          } else if (data?.success) {
            setVerificationResult({
              success: true,
              message: data.message || t('pages:paymentSuccess.success.verified'),
              orderId: data.orderId,
              transactionId: sessionId.slice(-8).toUpperCase(),
            });
            let cust: CustomerInfo;
            if (data.customerInfo) {
              cust = data.customerInfo;
            } else {
              const nameParts = (profile?.full_name || '').split(' ');
              cust = {
                firstName: nameParts[0] || '',
                lastName: nameParts.slice(1).join(' ') || '',
                email: user?.email || '',
              };
            }
            setCustomerInfo(cust);
            if (data.invoiceData && data.orderId) buildInvoiceFromResponse(data.invoiceData, data.orderId, cust);
            clearCart();
            localStorage.removeItem('cart');
            toast.success(t('pages:paymentSuccess.success.confirmed'));
          } else {
            setVerificationResult({ success: false, message: data?.message || t('pages:paymentSuccess.errors.verificationFailed') });
          }
        } catch {
          setVerificationResult({ success: false, message: t('pages:paymentSuccess.errors.unexpectedError') });
        } finally {
          setIsVerifying(false);
        }
      } else {
        setVerificationResult({ success: false, message: t('pages:paymentSuccess.errors.missingSession') });
        setIsVerifying(false);
      }
    };

    verifyPayment();
  }, [sessionId, isPayPal, paypalOrderId, orderId, clearCart, t, profile, user, buildInvoiceFromResponse]);

  // Generate and download invoice as printable HTML
  const handleDownloadInvoice = useCallback(() => {
    if (!invoiceData) return;

    const formatPrice = (value: number) => value.toFixed(2) + ' €';

    const invoiceHtml = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${t('pages:paymentSuccess.invoice.title')} - ${invoiceData.orderId.slice(-8).toUpperCase()}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 3px solid #2d5016; padding-bottom: 20px; }
    .company { font-size: 24px; font-weight: bold; color: #2d5016; }
    .company-sub { font-size: 12px; color: #666; margin-top: 4px; }
    .invoice-title { font-size: 28px; color: #2d5016; text-align: right; }
    .meta { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .meta-block { font-size: 13px; line-height: 1.6; }
    .meta-label { font-weight: 600; color: #555; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #2d5016; color: white; padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    td { padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 13px; }
    tr:nth-child(even) { background: #f9f9f9; }
    .text-right { text-align: right; }
    .totals { margin-top: 20px; margin-left: auto; width: 280px; }
    .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
    .totals-row.grand { border-top: 2px solid #2d5016; padding-top: 10px; margin-top: 6px; font-size: 16px; font-weight: bold; color: #2d5016; }
    .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company">Rif Raw Straw</div>
      <div class="company-sub">Artisanat Berbère Authentique</div>
    </div>
    <div class="invoice-title">${t('pages:paymentSuccess.invoice.title')}</div>
  </div>

  <div class="meta">
    <div class="meta-block">
      <div class="meta-label">${t('pages:paymentSuccess.invoice.billTo')}</div>
      <div>${invoiceData.customer.firstName} ${invoiceData.customer.lastName}</div>
      <div>${invoiceData.customer.email}</div>
    </div>
    <div class="meta-block" style="text-align:right;">
      <div class="meta-label">${t('pages:paymentSuccess.invoice.orderNumber')}</div>
      <div>${invoiceData.orderId.slice(-8).toUpperCase()}</div>
      <div class="meta-label" style="margin-top:8px;">${t('pages:paymentSuccess.invoice.date')}</div>
      <div>${invoiceData.date}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>${t('pages:paymentSuccess.invoice.product')}</th>
        <th class="text-right">${t('pages:paymentSuccess.invoice.qty')}</th>
        <th class="text-right">${t('pages:paymentSuccess.invoice.unitPrice')}</th>
        <th class="text-right">${t('pages:paymentSuccess.invoice.total')}</th>
      </tr>
    </thead>
    <tbody>
      ${invoiceData.items.map(item => `
      <tr>
        <td>${item.product_name}</td>
        <td class="text-right">${item.quantity}</td>
        <td class="text-right">${formatPrice(item.unit_price)}</td>
        <td class="text-right">${formatPrice(item.total_price)}</td>
      </tr>`).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row">
      <span>${t('pages:paymentSuccess.invoice.subtotal')}</span>
      <span>${formatPrice(invoiceData.subtotal)}</span>
    </div>
    <div class="totals-row">
      <span>${t('pages:paymentSuccess.invoice.shipping')}</span>
      <span>${invoiceData.shipping > 0 ? formatPrice(invoiceData.shipping) : t('pages:paymentSuccess.invoice.freeShipping')}</span>
    </div>
    ${invoiceData.discount > 0 ? `
    <div class="totals-row">
      <span>${t('pages:paymentSuccess.invoice.discount')}</span>
      <span>-${formatPrice(invoiceData.discount)}</span>
    </div>` : ''}
    <div class="totals-row grand">
      <span>${t('pages:paymentSuccess.invoice.grandTotal')}</span>
      <span>${formatPrice(invoiceData.total)}</span>
    </div>
  </div>

  <div class="footer">
    <p>${t('pages:paymentSuccess.invoice.thankYou')}</p>
    <p style="margin-top:4px;">Rif Raw Straw — rif-raw-straw.lovable.app</p>
  </div>

  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

    const blob = new Blob([invoiceHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }, [invoiceData, t]);

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
                <div className="w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-1">1</div>
                <div>
                  <p className="text-foreground font-medium">{t('pages:paymentSuccess.nextSteps.step1.title')}</p>
                  <p className="text-sm text-muted-foreground">{t('pages:paymentSuccess.nextSteps.step1.description')}</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-1">2</div>
                <div>
                  <p className="text-foreground font-medium">{t('pages:paymentSuccess.nextSteps.step2.title')}</p>
                  <p className="text-sm text-muted-foreground">{t('pages:paymentSuccess.nextSteps.step2.description')}</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-1">3</div>
                <div>
                  <p className="text-foreground font-medium">{t('pages:paymentSuccess.nextSteps.step3.title')}</p>
                  <p className="text-sm text-muted-foreground">{t('pages:paymentSuccess.nextSteps.step3.description')}</p>
                </div>
              </div>
            </div>
          </div>

          {!isVerifying && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {/* Invoice Download Button */}
              {verificationResult?.success && invoiceData && (
                <Button
                  onClick={handleDownloadInvoice}
                  variant="default"
                  className="bg-primary hover:bg-primary/90 gap-2"
                >
                  <Download className="w-4 h-4" />
                  {t('pages:paymentSuccess.invoice.download')}
                </Button>
              )}

              <Button asChild className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">
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
