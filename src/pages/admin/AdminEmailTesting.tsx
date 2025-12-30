import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  Check,
  RefreshCw,
  Clock,
  AlertTriangle,
  History
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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

interface EmailLog {
  id: string;
  template_name: string;
  recipient_email: string;
  recipient_name: string | null;
  order_id: string | null;
  status: string;
  error_message: string | null;
  metadata: any;
  sent_at: string | null;
  created_at: string;
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
      subtotal: 7500,
      shipping: 500,
      discount: 0,
      total: 8000,
      currency: 'EUR',
      items: [
        { name: 'Chapeau de paille berbère', quantity: 1, price: 4500, image: '/assets/images/products/chapeau_de_paille_berbere.jpg' },
        { name: 'Sac à main tissé traditionnel', quantity: 2, price: 1500, image: '/assets/images/products/sac_a_main_tisse_traditionnel.jpg' }
      ],
      shippingAddress: {
        address: '123 Rue de Test',
        city: 'Paris',
        postalCode: '75001',
        country: 'France'
      }
    },
    previewFields: ['Numéro de commande', 'Montant: 80,00 €', '2 articles', 'Adresse de livraison']
  },
  {
    id: 'shipping-notification',
    name: "Notification d'expédition",
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
    description: "Email envoyé lorsque la commande est livrée avec demande d'avis.",
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
    previewFields: ["Date de livraison: Aujourd'hui", '2 articles livrés', 'Lien vers avis produits']
  },
  {
    id: 'cancellation-refund',
    name: 'Annulation / Remboursement',
    description: "Email envoyé lors de l'annulation ou du remboursement d'une commande.",
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
      isRefund: true,
      reason: 'Demande du client - Email de test',
      items: [
        { name: 'Chapeau de paille berbère', quantity: 1, price: 4500 },
        { name: 'Sac à main tissé traditionnel', quantity: 2, price: 2000 }
      ]
    },
    previewFields: ['Montant commande: 85,00 €', 'Remboursement: 85,00 €', 'Raison: Demande client', '2 articles']
  }
];

const AdminEmailTesting = () => {
  const [testEmail, setTestEmail] = useState('');
  const [sendingStates, setSendingStates] = useState<Record<string, boolean>>({});
  const [previewStates, setPreviewStates] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');
  const [activeTab, setActiveTab] = useState('templates');

  const fetchEmailLogs = async () => {
    setLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setEmailLogs(data || []);
    } catch (error: any) {
      console.error('Error fetching email logs:', error);
      toast.error('Erreur lors du chargement des logs');
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchEmailLogs();
  }, []);

  const generatePreview = async (template: EmailTemplate) => {
    if (!testEmail) {
      toast.error('Veuillez entrer une adresse email pour la prévisualisation');
      return;
    }

    setPreviewStates(prev => ({ ...prev, [template.id]: true }));

    try {
      const testData = {
        ...template.testData,
        orderId: `PREVIEW-${Date.now().toString().slice(-8)}`,
        customerEmail: testEmail,
        previewOnly: true
      };

      const { data, error } = await supabase.functions.invoke(template.functionName, {
        body: testData
      });

      if (error) throw error;

      if (data?.previewHtml) {
        setPreviewHtml(data.previewHtml);
        setPreviewTitle(template.name);
        setPreviewOpen(true);
      } else {
        throw new Error('Aucune prévisualisation générée');
      }
    } catch (error: any) {
      console.error('Error generating preview:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setPreviewStates(prev => ({ ...prev, [template.id]: false }));
    }
  };

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
        // Refresh logs after sending
        setTimeout(fetchEmailLogs, 1000);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Envoyé</Badge>;
      case 'failed':
        return <Badge variant="destructive">Échec</Badge>;
      case 'pending':
        return <Badge variant="secondary">En attente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTemplateIcon = (templateName: string) => {
    const template = emailTemplates.find(t => t.functionName.includes(templateName.split('-')[0]));
    if (template) {
      const Icon = template.icon;
      return <Icon className={`h-4 w-4 ${template.color}`} />;
    }
    return <Mail className="h-4 w-4" />;
  };

  const formatTemplateName = (name: string) => {
    const mapping: Record<string, string> = {
      'order-confirmation': 'Confirmation commande',
      'shipping-notification': 'Expédition',
      'delivery-confirmation': 'Livraison',
      'cancellation-notification': 'Annulation',
      'refund-notification': 'Remboursement'
    };
    return mapping[name] || name;
  };

  // Stats
  const sentCount = emailLogs.filter(l => l.status === 'sent').length;
  const failedCount = emailLogs.filter(l => l.status === 'failed').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Mail className="h-6 w-6" />
            Centre de Test des Emails
          </h1>
          <p className="text-muted-foreground mt-1">
            Testez, prévisualisez et suivez vos emails transactionnels
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <CheckCircle className="h-3 w-3 text-green-600" />
            {sentCount} envoyés
          </Badge>
          {failedCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {failedCount} échecs
            </Badge>
          )}
        </div>
      </div>

      {/* Global Test Email Input */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Configuration de test</CardTitle>
          <CardDescription>
            Entrez l'adresse email pour les tests et prévisualisations.
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
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="templates" className="gap-2">
            <Mail className="h-4 w-4" />
            Templates ({emailTemplates.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Historique ({emailLogs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {emailTemplates.map((template) => {
              const Icon = template.icon;
              const isSending = sendingStates[template.id];
              const isPreviewing = previewStates[template.id];

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

                    <div className="flex gap-2">
                      <Button 
                        onClick={() => generatePreview(template)}
                        disabled={!testEmail || isPreviewing}
                        variant="outline"
                        className="flex-1 gap-2"
                      >
                        {isPreviewing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                        Prévisualiser
                      </Button>
                      <Button 
                        onClick={() => sendTestEmail(template)}
                        disabled={!testEmail || isSending}
                        className="flex-1 gap-2"
                      >
                        {isSending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        Envoyer
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Historique des emails</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchEmailLogs}
                  disabled={loadingLogs}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingLogs ? 'animate-spin' : ''}`} />
                  Actualiser
                </Button>
              </div>
              <CardDescription>
                Les 100 derniers emails envoyés depuis cette instance.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loadingLogs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : emailLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Mail className="h-12 w-12 mb-4 opacity-50" />
                  <p className="font-medium">Aucun email envoyé</p>
                  <p className="text-sm">Les emails envoyés apparaîtront ici.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Template</TableHead>
                        <TableHead>Destinataire</TableHead>
                        <TableHead>Commande</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {emailLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getTemplateIcon(log.template_name)}
                              <span className="text-sm font-medium">
                                {formatTemplateName(log.template_name)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm">{log.recipient_email}</p>
                              {log.recipient_name && (
                                <p className="text-xs text-muted-foreground">{log.recipient_name}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {log.order_id ? (
                              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                {log.order_id.slice(-8)}
                              </code>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {getStatusBadge(log.status)}
                              {log.error_message && (
                                <span className="text-xs text-destructive truncate max-w-[150px]" title={log.error_message}>
                                  {log.error_message}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {format(new Date(log.created_at), 'dd/MM HH:mm', { locale: fr })}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Help Section */}
      <Card className="bg-muted/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Conseils
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            • <strong>Prévisualisation:</strong> Cliquez sur "Prévisualiser" pour voir le rendu HTML de l'email avant envoi.
          </p>
          <p>
            • <strong>Mode Resend test:</strong> En développement, les emails ne sont envoyés qu'à l'adresse 
            associée à votre compte Resend.
          </p>
          <p>
            • <strong>Historique:</strong> Tous les emails sont automatiquement enregistrés avec leur statut.
          </p>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Prévisualisation: {previewTitle}
            </DialogTitle>
            <DialogDescription>
              Aperçu du rendu HTML de l'email tel qu'il apparaîtra dans la boîte de réception.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[70vh] border rounded-lg">
            {previewHtml && (
              <iframe
                srcDoc={previewHtml}
                className="w-full h-full min-h-[600px]"
                title="Email Preview"
                sandbox="allow-same-origin"
              />
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminEmailTesting;