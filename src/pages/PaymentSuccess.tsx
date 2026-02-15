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

interface ShippingAddress {
  line1: string;
  line2?: string;
  city: string;
  postalCode: string;
  country: string;
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
  shippingAddress: ShippingAddress | null;
  paymentMethod: string;
  currency: string;
  stripeSessionId: string;
}

const COUNTRY_NAMES: Record<string, string> = {
  FR: 'France', DE: 'Allemagne', BE: 'Belgique', CH: 'Suisse',
  ES: 'Espagne', IT: 'Italie', NL: 'Pays-Bas', GB: 'Royaume-Uni',
  US: 'États-Unis', CA: 'Canada', MA: 'Maroc',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  card: 'Carte bancaire', paypal: 'PayPal', sepa_debit: 'Prélèvement SEPA',
  bank_transfer: 'Virement bancaire',
};

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
      shippingAddress: responseInvoice.shippingAddress || null,
      paymentMethod: responseInvoice.paymentMethod || 'card',
      currency: responseInvoice.currency || 'EUR',
      stripeSessionId: responseInvoice.stripeSessionId || '',
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
    const invoiceNumber = `${new Date().getFullYear()}-${invoiceData.orderId.slice(-8).toUpperCase()}`;
    const paymentLabel = PAYMENT_METHOD_LABELS[invoiceData.paymentMethod] || invoiceData.paymentMethod;
    const countryName = invoiceData.shippingAddress?.country
      ? (COUNTRY_NAMES[invoiceData.shippingAddress.country] || invoiceData.shippingAddress.country)
      : '';

    const invoiceHtml = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Facture ${invoiceNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; color: #1a1a1a; background: #fff; }
    .page { max-width: 800px; margin: 0 auto; padding: 48px 40px; }

    /* === HEADER === */
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .brand { }
    .brand-name { font-size: 28px; font-weight: 700; color: #2d5016; letter-spacing: -0.5px; }
    .brand-tagline { font-size: 11px; color: #8a8a8a; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 2px; }
    .invoice-badge { text-align: right; }
    .invoice-badge h1 { font-size: 32px; font-weight: 300; color: #2d5016; text-transform: uppercase; letter-spacing: 3px; }

    /* === INVOICE META STRIP === */
    .meta-strip { display: flex; gap: 0; border: 1px solid #e5e5e5; border-radius: 6px; margin-bottom: 32px; overflow: hidden; }
    .meta-cell { flex: 1; padding: 14px 16px; border-right: 1px solid #e5e5e5; }
    .meta-cell:last-child { border-right: none; }
    .meta-label { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #999; font-weight: 600; margin-bottom: 4px; }
    .meta-value { font-size: 13px; font-weight: 600; color: #1a1a1a; }

    /* === ADDRESSES === */
    .addresses { display: flex; gap: 40px; margin-bottom: 36px; }
    .address-block { flex: 1; }
    .address-title { font-size: 9px; text-transform: uppercase; letter-spacing: 1.5px; color: #2d5016; font-weight: 700; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 2px solid #2d5016; display: inline-block; }
    .address-line { font-size: 12.5px; line-height: 1.7; color: #444; }
    .address-line strong { color: #1a1a1a; }

    /* === TABLE === */
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead th { background: #2d5016; color: #fff; padding: 11px 14px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
    thead th:first-child { border-radius: 4px 0 0 0; text-align: left; }
    thead th:last-child { border-radius: 0 4px 0 0; }
    thead th.right { text-align: right; }
    tbody td { padding: 12px 14px; font-size: 12.5px; border-bottom: 1px solid #f0f0f0; color: #333; }
    tbody td.right { text-align: right; font-variant-numeric: tabular-nums; }
    tbody tr:last-child td { border-bottom: none; }
    tbody tr:nth-child(even) { background: #fafaf8; }
    .product-name { font-weight: 500; }

    /* === TOTALS === */
    .totals-wrapper { display: flex; justify-content: flex-end; margin-bottom: 36px; }
    .totals { width: 300px; }
    .totals-row { display: flex; justify-content: space-between; padding: 7px 0; font-size: 12.5px; color: #555; }
    .totals-row.discount { color: #c0392b; }
    .totals-row.grand { border-top: 2px solid #2d5016; margin-top: 8px; padding-top: 12px; font-size: 16px; font-weight: 700; color: #2d5016; }
    .totals-value { font-variant-numeric: tabular-nums; font-weight: 500; }
    .totals-row.grand .totals-value { font-weight: 700; }

    /* === LEGAL MENTIONS === */
    .legal { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; }
    .legal-title { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #2d5016; font-weight: 700; margin-bottom: 8px; }
    .legal-text { font-size: 10.5px; line-height: 1.7; color: #888; }

    /* === FOOTER === */
    .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e5e5; display: flex; justify-content: space-between; align-items: flex-start; }
    .footer-company { font-size: 10px; color: #999; line-height: 1.8; }
    .footer-contact { font-size: 10px; color: #999; line-height: 1.8; text-align: right; }
    .footer-contact a { color: #2d5016; text-decoration: none; }

    /* === THANK YOU === */
    .thank-you { text-align: center; margin-top: 40px; padding: 20px; background: #f7f7f2; border-radius: 6px; }
    .thank-you p { font-size: 14px; color: #2d5016; font-weight: 500; }
    .thank-you .sub { font-size: 11px; color: #888; margin-top: 4px; font-weight: 400; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { padding: 24px 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="page">

    <!-- HEADER -->
    <div class="header">
      <div class="brand">
        <div class="brand-name">Rif Raw Straw</div>
        <div class="brand-tagline">Artisanat Berbère Authentique</div>
      </div>
      <div class="invoice-badge">
        <h1>Facture</h1>
      </div>
    </div>

    <!-- META STRIP -->
    <div class="meta-strip">
      <div class="meta-cell">
        <div class="meta-label">N° Facture</div>
        <div class="meta-value">${invoiceNumber}</div>
      </div>
      <div class="meta-cell">
        <div class="meta-label">Date d'émission</div>
        <div class="meta-value">${invoiceData.date}</div>
      </div>
      <div class="meta-cell">
        <div class="meta-label">Mode de paiement</div>
        <div class="meta-value">${paymentLabel}</div>
      </div>
      <div class="meta-cell">
        <div class="meta-label">N° Commande</div>
        <div class="meta-value">${invoiceData.orderId.slice(-8).toUpperCase()}</div>
      </div>
    </div>

    <!-- ADDRESSES -->
    <div class="addresses">
      <div class="address-block">
        <div class="address-title">Vendeur</div>
        <div class="address-line"><strong>Rif Raw Straw</strong></div>
        <div class="address-line">Artisanat & Commerce</div>
        <div class="address-line">Email : contact@rifrawstraw.com</div>
        <div class="address-line">Web : rif-raw-straw.lovable.app</div>
        <div class="address-line" style="margin-top:6px; font-size:10px; color:#aaa;">TVA non applicable, art. 293 B du CGI</div>
      </div>
      <div class="address-block">
        <div class="address-title">Client</div>
        <div class="address-line"><strong>${invoiceData.customer.firstName} ${invoiceData.customer.lastName}</strong></div>
        <div class="address-line">${invoiceData.customer.email}</div>
        ${invoiceData.shippingAddress ? `
        <div class="address-line" style="margin-top:8px;">
          <span style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#999;font-weight:600;">Adresse de livraison</span>
        </div>
        <div class="address-line">${invoiceData.shippingAddress.line1}</div>
        ${invoiceData.shippingAddress.line2 ? `<div class="address-line">${invoiceData.shippingAddress.line2}</div>` : ''}
        <div class="address-line">${invoiceData.shippingAddress.postalCode} ${invoiceData.shippingAddress.city}</div>
        <div class="address-line">${countryName}</div>
        ` : ''}
      </div>
    </div>

    <!-- PRODUCTS TABLE -->
    <table>
      <thead>
        <tr>
          <th>Désignation</th>
          <th class="right">Qté</th>
          <th class="right">P.U. TTC</th>
          <th class="right">Total TTC</th>
        </tr>
      </thead>
      <tbody>
        ${invoiceData.items.map(item => `
        <tr>
          <td class="product-name">${item.product_name}</td>
          <td class="right">${item.quantity}</td>
          <td class="right">${formatPrice(item.unit_price)}</td>
          <td class="right">${formatPrice(item.total_price)}</td>
        </tr>`).join('')}
      </tbody>
    </table>

    <!-- TOTALS -->
    <div class="totals-wrapper">
      <div class="totals">
        <div class="totals-row">
          <span>Sous-total TTC</span>
          <span class="totals-value">${formatPrice(invoiceData.subtotal)}</span>
        </div>
        <div class="totals-row">
          <span>Frais de livraison</span>
          <span class="totals-value">${invoiceData.shipping > 0 ? formatPrice(invoiceData.shipping) : 'Offerts'}</span>
        </div>
        ${invoiceData.discount > 0 ? `
        <div class="totals-row discount">
          <span>Réduction</span>
          <span class="totals-value">-${formatPrice(invoiceData.discount)}</span>
        </div>` : ''}
        <div class="totals-row grand">
          <span>Total TTC</span>
          <span class="totals-value">${formatPrice(invoiceData.total)}</span>
        </div>
      </div>
    </div>

    <!-- LEGAL MENTIONS -->
    <div class="legal">
      <div class="legal-title">Mentions légales</div>
      <div class="legal-text">
        TVA non applicable, article 293 B du Code Général des Impôts.<br>
        En cas de retard de paiement (clients professionnels), pénalités de retard : 3 fois le taux d'intérêt légal.
        Indemnité forfaitaire pour frais de recouvrement : 40 €.<br>
        Conditions de retour : conformément à notre politique, retour possible sous 14 jours après réception.
      </div>
    </div>

    <!-- REFERENCES -->
    <div class="legal" style="margin-top: 16px; border-top: none;">
      <div class="legal-title">Références techniques</div>
      <div class="legal-text">
        ID Commande : ${invoiceData.orderId}<br>
        ${invoiceData.stripeSessionId ? `ID Transaction : ${invoiceData.stripeSessionId.slice(-12).toUpperCase()}<br>` : ''}
        Date de paiement : ${invoiceData.date}
      </div>
    </div>

    <!-- FOOTER -->
    <div class="footer">
      <div class="footer-company">
        Rif Raw Straw<br>
        Artisanat Berbère Authentique<br>
        Conservation légale : 10 ans
      </div>
      <div class="footer-contact">
        <a href="mailto:contact@rifrawstraw.com">contact@rifrawstraw.com</a><br>
        <a href="https://rif-raw-straw.lovable.app">rif-raw-straw.lovable.app</a><br>
        Service client disponible par email
      </div>
    </div>

    <!-- THANK YOU -->
    <div class="thank-you">
      <p>Merci pour votre confiance !</p>
      <p class="sub">Chaque pièce est fabriquée à la main par nos artisans du Rif.</p>
    </div>

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