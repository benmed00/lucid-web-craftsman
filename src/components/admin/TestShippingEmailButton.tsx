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
import { Truck, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const TestShippingEmailButton = () => {
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
      const testData = {
        orderId: 'TEST-' + Date.now().toString().slice(-8),
        customerEmail: email,
        customerName: 'Client Test',
        trackingNumber: '1Z999AA10123456784',
        carrier: 'La Poste',
        trackingUrl:
          'https://www.laposte.fr/outils/suivre-vos-envois?code=1Z999AA10123456784',
        estimatedDelivery: '15-18 janvier 2025',
        shippingAddress: {
          address: '123 Rue de Test',
          city: 'Paris',
          postalCode: '75001',
          country: 'France',
        },
        items: [
          {
            name: 'Chapeau de paille berbère',
            quantity: 1,
            image: '/assets/images/products/chapeau_de_paille_berbere.jpg',
          },
          {
            name: 'Sac à main tissé traditionnel',
            quantity: 2,
            image: '/assets/images/products/sac_a_main_tisse_traditionnel.jpg',
          },
        ],
      };

      const { data, error } = await supabase.functions.invoke(
        'send-shipping-notification',
        {
          body: testData,
        }
      );

      if (error) throw error;

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
          <Truck className="h-4 w-4" />
          Test Expédition
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tester l'email d'expédition</DialogTitle>
          <DialogDescription>
            Envoyez un email de test pour vérifier le template de notification
            d'expédition.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="test-shipping-email">Adresse email de test</Label>
            <Input
              id="test-shipping-email"
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Note: Avec Resend en mode test, l'email sera envoyé uniquement à
              l'adresse associée à votre compte Resend.
            </p>
          </div>

          <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
            <p className="font-medium">Données de test incluses:</p>
            <ul className="text-muted-foreground list-disc list-inside">
              <li>Transporteur: La Poste</li>
              <li>N° de suivi: 1Z999AA10123456784</li>
              <li>Livraison estimée: 15-18 janvier 2025</li>
              <li>2 articles: Chapeau + Sac</li>
              <li>Adresse: 123 Rue de Test, 75001 Paris</li>
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
