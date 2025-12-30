import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const TestOrderEmailButton = () => {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [email, setEmail] = useState('');

  const sendTestEmail = async () => {
    if (!email) {
      toast.error('Veuillez entrer une adresse email');
      return;
    }

    setSending(true);
    try {
      const testOrderData = {
        orderId: 'TEST-' + Date.now().toString().slice(-8),
        customerEmail: email,
        customerName: 'Client Test',
        items: [
          {
            name: 'Chapeau de paille berbère',
            quantity: 1,
            price: 45.00,
            image: '/assets/images/products/chapeau_de_paille_berbere.jpg'
          },
          {
            name: 'Sac à main tissé traditionnel',
            quantity: 2,
            price: 65.00,
            image: '/assets/images/products/sac_a_main_tisse_traditionnel.jpg'
          }
        ],
        subtotal: 175.00,
        shipping: 5.90,
        discount: 10.00,
        total: 170.90,
        currency: 'EUR',
        shippingAddress: {
          address: '123 Rue de Test',
          city: 'Paris',
          postalCode: '75001',
          country: 'France'
        }
      };

      const { data, error } = await supabase.functions.invoke('send-order-confirmation', {
        body: testOrderData
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        toast.success(`Email de test envoyé à ${email}`);
        setOpen(false);
        setEmail('');
      } else {
        throw new Error(data?.error || 'Erreur inconnue');
      }
    } catch (error: any) {
      console.error('Error sending test email:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Mail className="h-4 w-4" />
          Test Email
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tester l'email de confirmation</DialogTitle>
          <DialogDescription>
            Envoyez un email de test pour vérifier le template de confirmation de commande.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="test-email">Adresse email de test</Label>
            <Input
              id="test-email"
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Note: Avec Resend en mode test, l'email sera envoyé uniquement à l'adresse associée à votre compte Resend.
            </p>
          </div>
          
          <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
            <p className="font-medium">Données de test incluses:</p>
            <ul className="text-muted-foreground list-disc list-inside">
              <li>Chapeau de paille berbère (1x 45€)</li>
              <li>Sac à main tissé traditionnel (2x 65€)</li>
              <li>Sous-total: 175€</li>
              <li>Livraison: 5.90€</li>
              <li>Remise: -10€</li>
              <li>Total: 170.90€</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={sendTestEmail} disabled={sending} className="gap-2">
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Envoi...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Envoyer le test
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
