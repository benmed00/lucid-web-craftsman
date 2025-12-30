import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SendDeliveryEmailButtonProps {
  orderId: string;
  orderItems: Array<{
    product_snapshot?: {
      name?: string;
    };
    quantity: number;
  }>;
  onEmailSent?: () => void;
}

export const SendDeliveryEmailButton = ({ orderId, orderItems, onEmailSent }: SendDeliveryEmailButtonProps) => {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState({
    customerEmail: '',
    customerName: '',
    deliveryDate: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const sendEmail = async () => {
    if (!formData.customerEmail || !formData.customerName) {
      toast.error('Veuillez remplir l\'email et le nom du client');
      return;
    }

    setSending(true);
    try {
      const items = orderItems.map(item => ({
        name: item.product_snapshot?.name || 'Produit',
        quantity: item.quantity
      }));

      const { data, error } = await supabase.functions.invoke('send-delivery-confirmation', {
        body: {
          orderId,
          customerEmail: formData.customerEmail,
          customerName: formData.customerName,
          deliveryDate: formData.deliveryDate,
          items,
          reviewUrl: `https://rifrawstraw.com/products`
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Email de confirmation de livraison envoyé');
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
        <Button variant="outline" size="sm" className="gap-1 text-green-600 hover:text-green-600">
          <CheckCircle className="h-3 w-3" />
          Livré
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmer la livraison</DialogTitle>
          <DialogDescription>
            Envoyez un email au client pour confirmer la livraison et demander un avis.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
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

          <div className="space-y-2">
            <Label htmlFor="deliveryDate">Date de livraison</Label>
            <Input
              id="deliveryDate"
              value={formData.deliveryDate}
              onChange={(e) => handleChange('deliveryDate', e.target.value)}
              placeholder="30 décembre 2024"
            />
          </div>

          <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
            <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
              Articles livrés:
            </p>
            <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
              {orderItems.map((item, index) => (
                <li key={index}>✓ {item.product_snapshot?.name || 'Produit'} × {item.quantity}</li>
              ))}
            </ul>
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
