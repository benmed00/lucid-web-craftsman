import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Truck, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SendShippingEmailButtonProps {
  orderId: string;
  orderItems: Array<{
    product_snapshot?: {
      name?: string;
      images?: string[];
    };
    quantity: number;
  }>;
  onEmailSent?: () => void;
}

export const SendShippingEmailButton = ({ orderId, orderItems, onEmailSent }: SendShippingEmailButtonProps) => {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState({
    customerEmail: '',
    customerName: '',
    trackingNumber: '',
    carrier: 'La Poste',
    trackingUrl: '',
    estimatedDelivery: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'France'
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const sendShippingEmail = async () => {
    if (!formData.customerEmail || !formData.customerName) {
      toast.error('Veuillez remplir l\'email et le nom du client');
      return;
    }

    setSending(true);
    try {
      const items = orderItems.map(item => ({
        name: item.product_snapshot?.name || 'Produit',
        quantity: item.quantity,
        image: item.product_snapshot?.images?.[0]
      }));

      const { data, error } = await supabase.functions.invoke('send-shipping-notification', {
        body: {
          orderId,
          customerEmail: formData.customerEmail,
          customerName: formData.customerName,
          trackingNumber: formData.trackingNumber || undefined,
          carrier: formData.carrier || undefined,
          trackingUrl: formData.trackingUrl || undefined,
          estimatedDelivery: formData.estimatedDelivery || undefined,
          shippingAddress: {
            address: formData.address,
            city: formData.city,
            postalCode: formData.postalCode,
            country: formData.country
          },
          items
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Email d\'expédition envoyé');
        setOpen(false);
        onEmailSent?.();
      } else {
        throw new Error(data?.error || 'Erreur inconnue');
      }
    } catch (error: any) {
      console.error('Error sending shipping email:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Truck className="h-3 w-3" />
          Notifier
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Envoyer une notification d'expédition</DialogTitle>
          <DialogDescription>
            Envoyez un email au client pour l'informer que sa commande a été expédiée.
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="carrier">Transporteur</Label>
              <Input
                id="carrier"
                value={formData.carrier}
                onChange={(e) => handleChange('carrier', e.target.value)}
                placeholder="La Poste"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trackingNumber">N° de suivi</Label>
              <Input
                id="trackingNumber"
                value={formData.trackingNumber}
                onChange={(e) => handleChange('trackingNumber', e.target.value)}
                placeholder="1Z999..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="trackingUrl">URL de suivi</Label>
            <Input
              id="trackingUrl"
              value={formData.trackingUrl}
              onChange={(e) => handleChange('trackingUrl', e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimatedDelivery">Date de livraison estimée</Label>
            <Input
              id="estimatedDelivery"
              value={formData.estimatedDelivery}
              onChange={(e) => handleChange('estimatedDelivery', e.target.value)}
              placeholder="15-18 janvier 2025"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="123 Rue de Paris"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-2">
              <Label htmlFor="postalCode">Code postal</Label>
              <Input
                id="postalCode"
                value={formData.postalCode}
                onChange={(e) => handleChange('postalCode', e.target.value)}
                placeholder="75001"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="city">Ville</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="Paris"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={sendShippingEmail} disabled={sending} className="gap-2">
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
