import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Mail, 
  Send, 
  Loader2, 
  ShoppingBag, 
  Truck, 
  CheckCircle, 
  XCircle,
  Eye,
  Copy,
  Check
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  functionName: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  testData: any;
  previewFields: string[];
}

const emailTemplates: EmailTemplate[] = [
  {
    id: 'order-confirmation',
    name: 'Confirmation de commande',
    description: 'Email envoyé après un paiement réussi avec le récapitulatif de la commande.',
    functionName: 'send-order-confirmation',
    icon: ShoppingBag,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
    testData: {
      orderId: 'TEST-ORDER',
      customerEmail: '',
      customerName: 'Client Test',
      orderAmount: 8500,
      currency: 'EUR',
      items: [
        { name: 'Chapeau de paille berbère', quantity: 1, price: 4500, image: '/assets/images/products/chapeau_de_paille_berbere.jpg' },
        { name: 'Sac à main tissé traditionnel', quantity: 2, price: 2000, image: '/assets/images/products/sac_a_main_tisse_traditionnel.jpg' }
      ],
      shippingAddress: {
        name: 'Client Test',
        address: '123 Rue de Test',
        city: 'Paris',
        postalCode: '75001',
        country: 'France'
      }
    },
    previewFields: ['Numéro de commande', 'Montant: 85,00 €', '2 articles', 'Adresse de livraison']
  },
  {
    id: 'shipping-notification',
    name: 'Notification d\'expédition',
    description: 'Email envoyé lorsque la commande est expédiée avec le numéro de suivi.',
    functionName: 'send-shipping-notification',
    icon: Truck,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-950',
    testData: {
      orderId: 'TEST-SHIP',
      customerEmail: '',
      customerName: 'Client Test',
      trackingNumber: '1Z999AA10123456784',
      carrier: 'La Poste',
      trackingUrl: 'https://www.laposte.fr/outils/suivre-vos-envois?code=1Z999AA10123456784',
      estimatedDelivery: '15-18 janvier 2025',
      shippingAddress: {
        address: '123 Rue de Test',
        city: 'Paris',
        postalCode: '75001',
        country: 'France'
      },
      items: [
        { name: 'Chapeau de paille berbère', quantity: 1, image: '/assets/images/products/chapeau_de_paille_berbere.jpg' },
        { name: 'Sac à main tissé traditionnel', quantity: 2, image: '/assets/images/products/sac_a_main_tisse_traditionnel.jpg' }
      ]
    },
    previewFields: ['Transporteur: La Poste', 'N° suivi: 1Z999AA10123456784', 'Livraison: 15-18 janvier', '2 articles']
  },
  {
    id: 'delivery-confirmation',
    name: 'Confirmation de livraison',
    description: 'Email envoyé lorsque la commande est livrée avec demande d\'avis.',
    functionName: 'send-delivery-confirmation',
    icon: CheckCircle,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950',
    testData: {
      orderId: 'TEST-DELIV',
      customerEmail: '',
      customerName: 'Client Test',
      deliveryDate: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
      items: [
        { name: 'Chapeau de paille berbère', quantity: 1 },
        { name: 'Sac à main tissé traditionnel', quantity: 2 }
      ],
      reviewUrl: 'https://rifrawstraw.com/products'
    },
    previewFields: ['Date de livraison: Aujourd\'hui', '2 articles livrés', 'Lien vers avis produits']
  },
  {
    id: 'cancellation-refund',
    name: 'Annulation / Remboursement',
    description: 'Email envoyé lors de l\'annulation ou du remboursement d\'une commande.',
    functionName: 'send-cancellation-email',
    icon: XCircle,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950',
    testData: {
      orderId: 'TEST-CANCEL',
      customerEmail: '',
      customerName: 'Client Test',
      orderAmount: 8500,
      refundAmount: 8500,
      reason: 'Demande du client - Email de test',
      items: [
        { name: 'Chapeau de paille berbère', quantity: 1 },
        { name: 'Sac à main tissé traditionnel', quantity: 2 }
      ]
    },
    previewFields: ['Montant commande: 85,00 €', 'Remboursement: 85,00 €', 'Raison: Demande client', '2 articles']
  }
];

const AdminEmailTesting = () => {
  const [testEmail, setTestEmail] = useState('');
  const [sendingStates, setSendingStates] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const sendTestEmail = async (template: EmailTemplate) => {
    if (!testEmail) {
      toast.error('Veuillez entrer une adresse email de test');
      return;
    }

    setSendingStates(prev => ({ ...prev, [template.id]: true }));

    try {
      const testData = {
        ...template.testData,
        orderId: `TEST-${Date.now().toString().slice(-8)}`,
        customerEmail: testEmail
      };

      const { data, error } = await supabase.functions.invoke(template.functionName, {
        body: testData
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Email "${template.name}" envoyé à ${testEmail}`);
      } else {
        throw new Error(data?.error || 'Erreur inconnue');
      }
    } catch (error: any) {
      console.error('Error sending test email:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setSendingStates(prev => ({ ...prev, [template.id]: false }));
    }
  };

  const copyFunctionName = (functionName: string, templateId: string) => {
    navigator.clipboard.writeText(functionName);
    setCopiedId(templateId);
    toast.success('Nom de la fonction copié');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const sendAllTestEmails = async () => {
    if (!testEmail) {
      toast.error('Veuillez entrer une adresse email de test');
      return;
    }

    for (const template of emailTemplates) {
      await sendTestEmail(template);
      // Small delay between emails
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Mail className="h-6 w-6" />
            Centre de Test des Emails
          </h1>
          <p className="text-muted-foreground mt-1">
            Testez et prévisualisez tous les templates d'emails transactionnels
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          {emailTemplates.length} templates
        </Badge>
      </div>

      {/* Global Test Email Input */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Configuration de test</CardTitle>
          <CardDescription>
            Entrez l'adresse email où envoyer les tests. Avec Resend en mode test, 
            les emails seront envoyés uniquement à l'adresse associée à votre compte Resend.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="global-test-email" className="sr-only">Email de test</Label>
              <Input
                id="global-test-email"
                type="email"
                placeholder="votre@email.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="w-full"
              />
            </div>
            <Button 
              onClick={sendAllTestEmails} 
              disabled={!testEmail || Object.values(sendingStates).some(Boolean)}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              Envoyer tous les tests
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email Templates */}
      <Tabs defaultValue="grid" className="w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Templates disponibles</h2>
          <TabsList>
            <TabsTrigger value="grid">Grille</TabsTrigger>
            <TabsTrigger value="list">Liste</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="grid" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {emailTemplates.map((template) => {
              const Icon = template.icon;
              const isSending = sendingStates[template.id];

              return (
                <Card key={template.id} className="overflow-hidden">
                  <CardHeader className={`${template.bgColor} pb-3`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-background/80 ${template.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          <button
                            onClick={() => copyFunctionName(template.functionName, template.id)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
                          >
                            <code className="bg-background/50 px-1.5 py-0.5 rounded">
                              {template.functionName}
                            </code>
                            {copiedId === template.id ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {template.description}
                    </p>
                    
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Données de test incluses:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {template.previewFields.map((field, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs font-normal">
                            {field}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <Button 
                      onClick={() => sendTestEmail(template)}
                      disabled={!testEmail || isSending}
                      className="w-full gap-2"
                      variant="outline"
                    >
                      {isSending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Envoi en cours...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Envoyer un test
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="list" className="mt-0">
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {emailTemplates.map((template) => {
                  const Icon = template.icon;
                  const isSending = sendingStates[template.id];

                  return (
                    <div key={template.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${template.bgColor} ${template.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-medium">{template.name}</h3>
                          <p className="text-sm text-muted-foreground">{template.description}</p>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded mt-1 inline-block">
                            {template.functionName}
                          </code>
                        </div>
                      </div>
                      <Button 
                        onClick={() => sendTestEmail(template)}
                        disabled={!testEmail || isSending}
                        size="sm"
                        className="gap-2"
                      >
                        {isSending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        Tester
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Help Section */}
      <Card className="bg-muted/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Conseils pour les tests
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            • <strong>Mode Resend test:</strong> En développement, les emails ne sont envoyés qu'à l'adresse 
            associée à votre compte Resend, quelle que soit l'adresse saisie.
          </p>
          <p>
            • <strong>Validation du domaine:</strong> Pour envoyer à d'autres adresses, validez votre domaine 
            sur <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">resend.com/domains</a>.
          </p>
          <p>
            • <strong>Logs des fonctions:</strong> Consultez les logs dans le dashboard Supabase pour 
            déboguer les erreurs d'envoi.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminEmailTesting;
