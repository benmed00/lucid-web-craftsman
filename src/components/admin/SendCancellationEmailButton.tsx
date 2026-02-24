import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { XCircle, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCurrency } from '@/stores/currencyStore';

interface SendCancellationEmailButtonProps {
  orderId: string;
  orderAmount: number;
  orderItems: Array<{
    product_snapshot?: {
      name?: string;
      price?: number;
    };
    quantity: number;
    total_price: number;
  }>;
  onEmailSent?: () => void;
}

export const SendCancellationEmailButton = ({
  orderId,
  orderAmount,
  orderItems,
  onEmailSent,
}: SendCancellationEmailButtonProps) => {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const { formatPrice } = useCurrency();
  const [formData, setFormData] = useState({
    customerEmail: '',
    customerName: '',
    isRefund: true,
    reason: '',
    refundMethod: 'Carte bancaire',
    refundDelay: '5-10 jours ouvrés',
  });

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const sendEmail = async () => {
    if (!formData.customerEmail || !formData.customerName) {
      toast.error("Veuillez remplir l'email et le nom du client");
      return;
    }

    setSending(true);
    try {
      const items = orderItems.map((item) => ({
        name: item.product_snapshot?.name || 'Produit',
        quantity: item.quantity,
        price: item.total_price,
      }));

      const { data, error } = await supabase.functions.invoke(
        'send-cancellation-email',
        {
          body: {
            orderId,
            customerEmail: formData.customerEmail,
            customerName: formData.customerName,
            isRefund: formData.isRefund,
            reason: formData.reason || undefined,
            refundAmount: formData.isRefund ? orderAmount / 100 : undefined,
            currency: 'EUR',
            items,
            refundMethod: formData.isRefund ? formData.refundMethod : undefined,
            refundDelay: formData.isRefund ? formData.refundDelay : undefined,
          },
        }
      );

      if (error) throw error;

      if (data?.success) {
        toast.success(
          `Email ${formData.isRefund ? 'de remboursement' : "d'annulation"} envoyé`
        );
        setOpen(false);
        onEmailSent?.();
      } else {
        throw new Error(data?.error || 'Erreur inconnue');
      }
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1 text-destructive hover:text-destructive"
        >
          <XCircle className="h-3 w-3" />
          Annulation
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Envoyer une notification d'annulation</DialogTitle>
          <DialogDescription>
            Envoyez un email au client pour l'informer de l'annulation ou du
            remboursement.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Nom du client *</Label>
              <Input
                id="customerName"
                value={formData.customerName}
                onChange={(e) => handleChange('customerName', e.target.value)}
                placeholder="Jean Dupont"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerEmail">Email *</Label>
              <Input
                id="customerEmail"
                type="email"
                value={formData.customerEmail}
                onChange={(e) => handleChange('customerEmail', e.target.value)}
                placeholder="client@email.com"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <Label htmlFor="isRefund" className="font-medium">
                Remboursement
              </Label>
              <p className="text-xs text-muted-foreground">
                Inclure les détails du remboursement
              </p>
            </div>
            <Switch
              id="isRefund"
              checked={formData.isRefund}
              onCheckedChange={(checked) => handleChange('isRefund', checked)}
            />
          </div>

          {formData.isRefund && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg space-y-3">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Montant à rembourser: {formatPrice(orderAmount / 100)}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="refundMethod" className="text-xs">
                    Mode de remboursement
                  </Label>
                  <Input
                    id="refundMethod"
                    value={formData.refundMethod}
                    onChange={(e) =>
                      handleChange('refundMethod', e.target.value)
                    }
                    placeholder="Carte bancaire"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="refundDelay" className="text-xs">
                    Délai estimé
                  </Label>
                  <Input
                    id="refundDelay"
                    value={formData.refundDelay}
                    onChange={(e) =>
                      handleChange('refundDelay', e.target.value)
                    }
                    placeholder="5-10 jours"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">Raison (optionnel)</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => handleChange('reason', e.target.value)}
              placeholder="Raison de l'annulation..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={sendEmail} disabled={sending} className="gap-2">
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Envoi...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Envoyer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
