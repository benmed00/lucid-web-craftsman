// Order Payment Details and Refund Management Tab
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Receipt,
  History,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getOrderPaymentDetails,
  processRefund,
  type OrderPaymentDetails,
  type RefundRecord,
} from '@/services/orderService';
import { useQueryClient } from '@tanstack/react-query';

interface OrderPaymentTabProps {
  orderId: string;
}

const REFUND_STATUS_CONFIG = {
  none: { label: 'Aucun', color: 'bg-gray-100 text-gray-800', icon: CheckCircle },
  partial: { label: 'Partiel', color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
  full: { label: 'Complet', color: 'bg-green-100 text-green-800', icon: RefreshCw },
};

export function OrderPaymentTab({ orderId }: OrderPaymentTabProps) {
  const [payment, setPayment] = useState<OrderPaymentDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);
  const queryClient = useQueryClient();

  const fetchPayment = async () => {
    setIsLoading(true);
    try {
      const data = await getOrderPaymentDetails(orderId);
      setPayment(data);
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

  return (
    <div className="space-y-4">
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
                <span className="font-medium">{payment.payment_method || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Statut</span>
                {payment.paid_at ? (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Payé
                  </Badge>
                ) : (
                  <Badge className="bg-yellow-100 text-yellow-800">
                    <Clock className="h-3 w-3 mr-1" />
                    En attente
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {payment.payment_reference && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Référence</span>
                  <span className="font-mono text-xs truncate max-w-[150px]">
                    {payment.payment_reference}
                  </span>
                </div>
              )}
              {payment.stripe_session_id && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Session Stripe</span>
                  <span className="font-mono text-xs truncate max-w-[150px]">
                    {payment.stripe_session_id.slice(0, 20)}...
                  </span>
                </div>
              )}
              {payment.paid_at && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Date de paiement</span>
                  <span className="text-sm">
                    {new Date(payment.paid_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              )}
            </div>
          </div>
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
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        {new Date(refund.processed_at).toLocaleDateString('fr-FR')}
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
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
