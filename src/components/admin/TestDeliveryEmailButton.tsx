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
import { CheckCircle, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const TestDeliveryEmailButton = () => {
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
        deliveryDate: new Date().toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        items: [
          { name: 'Chapeau de paille berbère', quantity: 1 },
          { name: 'Sac à main tissé traditionnel', quantity: 2 },
        ],
        reviewUrl: 'https://rifrawstraw.com/products',
      };

      const { data, error } = await supabase.functions.invoke(
        'send-delivery-confirmation',
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
          <CheckCircle className="h-4 w-4" />
          Test Livraison
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tester l'email de livraison</DialogTitle>
          <DialogDescription>
            Envoyez un email de test pour vérifier le template de confirmation
            de livraison.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="test-delivery-email">Adresse email de test</Label>
            <Input
              id="test-delivery-email"
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

          <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg text-sm space-y-1">
            <p className="font-medium text-green-900 dark:text-green-100">
              Données de test incluses:
            </p>
            <ul className="text-green-700 dark:text-green-300 list-disc list-inside">
              <li>Date de livraison: Aujourd'hui</li>
              <li>2 articles: Chapeau + Sac</li>
              <li>Lien vers les avis produits</li>
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
