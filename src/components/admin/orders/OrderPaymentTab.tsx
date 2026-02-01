// Order Payment Details and Refund Management Tab
// Shows Stripe payment details, errors, and enables admin refunds
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  CreditCard,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  History,
  ExternalLink,
  Loader2,
  Info,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getOrderPaymentDetails,
  processRefund,
  type OrderPaymentDetails,
} from '@/services/orderService';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface OrderPaymentTabProps {
  orderId: string;
}

// Extended payment info from Stripe
interface StripePaymentInfo {
  payment_intent_id: string | null;
  payment_method: string | null;
  payment_method_type: string | null;
  last_four: string | null;
  brand: string | null;
  error_message: string | null;
  error_code: string | null;
  decline_code: string | null;
  status: string | null;
  amount_received: number | null;
  stripe_customer_id: string | null;
  receipt_url: string | null;
}

interface OrderMetadata {
  payment_intent_id?: string;
  stripe_session_id?: string;
  stripe_customer_id?: string;
  discount_code?: string;
  discount_amount?: number;
  payment_error?: string;
  payment_error_code?: string;
  decline_code?: string;
  refund_history?: Array<{
    id: string;
    amount: number;
    reason: string;
    processed_by: string;
    processed_at: string;
    stripe_refund_id: string | null;
  }>;
}

const REFUND_STATUS_CONFIG = {
  none: { label: 'Aucun', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200', icon: CheckCircle },
  partial: { label: 'Partiel', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: AlertTriangle },
  full: { label: 'Complet', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: RefreshCw },
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  card: 'Carte bancaire',
  sepa_debit: 'Prélèvement SEPA',
  ideal: 'iDEAL',
  bancontact: 'Bancontact',
  paypal: 'PayPal',
};

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  succeeded: { label: 'Réussi', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: CheckCircle },
  processing: { label: 'En cours', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: Loader2 },
  requires_payment_method: { label: 'Méthode requise', color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
  requires_confirmation: { label: 'Confirmation requise', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  requires_action: { label: 'Action requise', color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
  canceled: { label: 'Annulé', color: 'bg-gray-100 text-gray-800', icon: XCircle },
  failed: { label: 'Échoué', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: XCircle },
};

export function OrderPaymentTab({ orderId }: OrderPaymentTabProps) {
  const [payment, setPayment] = useState<OrderPaymentDetails | null>(null);
  const [stripeInfo, setStripeInfo] = useState<StripePaymentInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);
  const queryClient = useQueryClient();

  const fetchPayment = async () => {
    setIsLoading(true);
    try {
      // Get local payment data
      const data = await getOrderPaymentDetails(orderId);
      setPayment(data);

      // Get order metadata for Stripe info
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('metadata, payment_method, payment_reference, stripe_session_id')
        .eq('id', orderId)
        .single();

      if (!orderError && order) {
        const metadata = (order.metadata || {}) as OrderMetadata;
        
        setStripeInfo({
          payment_intent_id: metadata.payment_intent_id || order.payment_reference || null,
          payment_method: order.payment_method || null,
          payment_method_type: order.payment_method || null,
          last_four: null, // Would need Stripe API call to get this
          brand: null, // Would need Stripe API call to get this
          error_message: metadata.payment_error || null,
          error_code: metadata.payment_error_code || null,
          decline_code: metadata.decline_code || null,
          status: data?.paid_at ? 'succeeded' : 'pending',
          amount_received: data?.amount || null,
          stripe_customer_id: metadata.stripe_customer_id || null,
          receipt_url: null, // Would need Stripe API call
        });
      }
    } catch (error) {
      console.error('Error fetching payment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayment();
  }, [orderId]);

  const handleRefund = async () => {
    if (!refundAmount || parseFloat(refundAmount) <= 0) {
      toast.error('Montant invalide');
      return;
    }
    if (!refundReason.trim()) {
      toast.error('Veuillez indiquer une raison');
      return;
    }

    setIsProcessingRefund(true);
    try {
      // Convert to cents
      const amountCents = Math.round(parseFloat(refundAmount) * 100);
      const result = await processRefund(orderId, amountCents, refundReason);
      
      if (result.success) {
        toast.success(result.message);
        setRefundAmount('');
        setRefundReason('');
        fetchPayment();
        queryClient.invalidateQueries({ queryKey: ['order', orderId] });
        queryClient.invalidateQueries({ queryKey: ['orders'] });
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Erreur lors du remboursement');
    } finally {
      setIsProcessingRefund(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!payment) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Informations de paiement non disponibles
          </p>
        </CardContent>
      </Card>
    );
  }

  const refundStatusConfig = REFUND_STATUS_CONFIG[payment.refund_status];
  const RefundIcon = refundStatusConfig.icon;
  const maxRefundable = (payment.amount - payment.refund_amount) / 100;
  const refundPercentage = payment.amount > 0 
    ? (payment.refund_amount / payment.amount) * 100 
    : 0;

  const paymentStatusConfig = stripeInfo?.status 
    ? PAYMENT_STATUS_CONFIG[stripeInfo.status] || PAYMENT_STATUS_CONFIG.processing
    : PAYMENT_STATUS_CONFIG.processing;
  const PaymentStatusIcon = paymentStatusConfig.icon;

  return (
    <div className="space-y-4">
      {/* Payment Error Banner */}
      {stripeInfo?.error_message && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-red-800 dark:text-red-200">
                  Erreur de paiement
                </p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  {stripeInfo.error_message}
                </p>
                {stripeInfo.error_code && (
                  <p className="text-xs font-mono text-red-600">
                    Code: {stripeInfo.error_code}
                    {stripeInfo.decline_code && ` / Déclin: ${stripeInfo.decline_code}`}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Détails du paiement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Montant total</span>
                <span className="font-bold text-lg">
                  {(payment.amount / 100).toFixed(2)} {payment.currency.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Méthode</span>
                <span className="font-medium">
                  {PAYMENT_METHOD_LABELS[payment.payment_method || ''] || payment.payment_method || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Statut</span>
                <Badge className={paymentStatusConfig.color}>
                  <PaymentStatusIcon className="h-3 w-3 mr-1" />
                  {paymentStatusConfig.label}
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              {stripeInfo?.payment_intent_id && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Payment Intent</span>
                  <span className="font-mono text-xs truncate max-w-[180px]" title={stripeInfo.payment_intent_id}>
                    {stripeInfo.payment_intent_id.slice(0, 24)}...
                  </span>
                </div>
              )}
              {payment.stripe_session_id && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Session Stripe</span>
                  <span className="font-mono text-xs truncate max-w-[180px]" title={payment.stripe_session_id}>
                    {payment.stripe_session_id.slice(0, 20)}...
                  </span>
                </div>
              )}
              {stripeInfo?.stripe_customer_id && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Client Stripe</span>
                  <span className="font-mono text-xs truncate max-w-[180px]" title={stripeInfo.stripe_customer_id}>
                    {stripeInfo.stripe_customer_id.slice(0, 20)}...
                  </span>
                </div>
              )}
              {payment.paid_at && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Date de paiement</span>
                  <span className="text-sm">
                    {new Date(payment.paid_at).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Stripe Dashboard Link */}
          {stripeInfo?.payment_intent_id && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Info className="h-4 w-4" />
                  <span>Pour plus de détails, consultez le tableau de bord Stripe</span>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a 
                    href={`https://dashboard.stripe.com/payments/${stripeInfo.payment_intent_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3 w-3 mr-2" />
                    Ouvrir Stripe
                  </a>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Refund Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Remboursements
            </CardTitle>
            <Badge className={refundStatusConfig.color}>
              <RefundIcon className="h-3 w-3 mr-1" />
              {refundStatusConfig.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Refund Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Remboursé: {(payment.refund_amount / 100).toFixed(2)} €
              </span>
              <span className="text-muted-foreground">
                Restant: {maxRefundable.toFixed(2)} €
              </span>
            </div>
            <Progress value={refundPercentage} className="h-2" />
          </div>

          {/* Refund History */}
          {payment.refund_history.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Historique des remboursements
                </h4>
                <div className="space-y-2">
                  {payment.refund_history.map((refund) => (
                    <div
                      key={refund.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-sm">
                          -{(refund.amount / 100).toFixed(2)} €
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {refund.reason}
                        </p>
                        {refund.stripe_refund_id && (
                          <p className="text-xs font-mono text-muted-foreground">
                            Stripe: {refund.stripe_refund_id.slice(0, 15)}...
                          </p>
                        )}
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        {new Date(refund.processed_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Process Refund Form */}
          {maxRefundable > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Nouveau remboursement</h4>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="refund-amount" className="text-xs">
                      Montant (max: {maxRefundable.toFixed(2)} €)
                    </Label>
                    <Input
                      id="refund-amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={maxRefundable}
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      placeholder="0.00"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="refund-reason" className="text-xs">
                      Raison
                    </Label>
                    <Input
                      id="refund-reason"
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      placeholder="Motif du remboursement"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRefundAmount(maxRefundable.toFixed(2))}
                  >
                    Remboursement total
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        disabled={!refundAmount || !refundReason || isProcessingRefund}
                      >
                        <RefreshCw className="h-3 w-3 mr-2" />
                        {isProcessingRefund ? 'Traitement...' : 'Rembourser'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmer le remboursement</AlertDialogTitle>
                        <AlertDialogDescription>
                          Vous allez rembourser <strong>{refundAmount} €</strong> au client.
                          <br />
                          Raison: {refundReason}
                          <br /><br />
                          Cette action est irréversible.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRefund}>
                          Confirmer le remboursement
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                <p className="text-xs text-muted-foreground">
                  Note: Le remboursement est enregistré localement. Pour exécuter le remboursement via Stripe, 
                  utilisez le tableau de bord Stripe.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}