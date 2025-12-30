import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Clock, 
  Plus, 
  Loader2, 
  RefreshCw, 
  Calendar,
  Mail,
  Trash2,
  Play,
  CheckCircle,
  XCircle,
  AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, addHours, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ScheduledEmail {
  id: string;
  template_name: string;
  recipient_email: string;
  recipient_name: string | null;
  scheduled_for: string;
  status: string;
  email_data: any;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

const templateOptions = [
  { value: 'order-confirmation', label: 'Confirmation de commande' },
  { value: 'shipping-notification', label: "Notification d'expédition" },
  { value: 'delivery-confirmation', label: 'Confirmation de livraison' },
  { value: 'cancellation-email', label: 'Annulation / Remboursement' },
];

const EmailScheduler: React.FC = () => {
  const [scheduledEmails, setScheduledEmails] = useState<ScheduledEmail[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  // Form state
  const [formTemplate, setFormTemplate] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formName, setFormName] = useState('');
  const [formScheduledFor, setFormScheduledFor] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchScheduledEmails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('scheduled_emails')
        .select('*')
        .order('scheduled_for', { ascending: true })
        .limit(50);

      if (error) throw error;
      setScheduledEmails(data || []);
    } catch (error: any) {
      console.error('Error fetching scheduled emails:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduledEmails();
  }, []);

  const handleSubmit = async () => {
    if (!formTemplate || !formEmail || !formScheduledFor) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('scheduled_emails')
        .insert({
          template_name: formTemplate,
          recipient_email: formEmail,
          recipient_name: formName || null,
          scheduled_for: new Date(formScheduledFor).toISOString(),
          email_data: {
            orderId: `SCHED-${Date.now().toString().slice(-8)}`,
            customerName: formName || 'Client',
          },
        });

      if (error) throw error;

      toast.success('Email programmé avec succès');
      setDialogOpen(false);
      setFormTemplate('');
      setFormEmail('');
      setFormName('');
      setFormScheduledFor('');
      fetchScheduledEmails();
    } catch (error: any) {
      console.error('Error scheduling email:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const cancelScheduledEmail = async (id: string) => {
    try {
      const { error } = await supabase
        .from('scheduled_emails')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;
      toast.success('Email annulé');
      fetchScheduledEmails();
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    }
  };

  const processScheduledEmails = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-scheduled-emails');
      
      if (error) throw error;

      if (data?.processed > 0) {
        toast.success(`${data.processed} email(s) traité(s)`);
      } else {
        toast.info('Aucun email à traiter');
      }
      fetchScheduledEmails();
    } catch (error: any) {
      console.error('Error processing emails:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />En attente</Badge>;
      case 'sent':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 gap-1"><CheckCircle className="h-3 w-3" />Envoyé</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Échec</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="gap-1"><AlertTriangle className="h-3 w-3" />Annulé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTemplateName = (value: string) => {
    return templateOptions.find(t => t.value === value)?.label || value;
  };

  const pendingCount = scheduledEmails.filter(e => e.status === 'pending').length;

  // Set minimum datetime to now
  const minDateTime = format(new Date(), "yyyy-MM-dd'T'HH:mm");

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            {pendingCount} en attente
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={processScheduledEmails}
            disabled={processing || pendingCount === 0}
            className="gap-2"
          >
            {processing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Traiter maintenant
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchScheduledEmails}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Programmer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Programmer un email</DialogTitle>
                <DialogDescription>
                  Planifiez l'envoi d'un email à une date et heure spécifique.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="template">Template *</Label>
                  <Select value={formTemplate} onValueChange={setFormTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templateOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email du destinataire *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="client@example.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Nom du destinataire</Label>
                  <Input
                    id="name"
                    placeholder="Nom du client"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scheduled">Date et heure d'envoi *</Label>
                  <Input
                    id="scheduled"
                    type="datetime-local"
                    min={minDateTime}
                    value={formScheduledFor}
                    onChange={(e) => setFormScheduledFor(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setFormScheduledFor(format(addHours(new Date(), 1), "yyyy-MM-dd'T'HH:mm"))}
                  >
                    Dans 1h
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setFormScheduledFor(format(addHours(new Date(), 24), "yyyy-MM-dd'T'HH:mm"))}
                  >
                    Dans 24h
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setFormScheduledFor(format(addDays(new Date(), 7), "yyyy-MM-dd'T'HH:mm"))}
                  >
                    Dans 7 jours
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Calendar className="h-4 w-4" />
                  )}
                  Programmer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Scheduled Emails Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Emails programmés</CardTitle>
          <CardDescription>
            Gérez les emails planifiés pour envoi ultérieur.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : scheduledEmails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mb-4 opacity-50" />
              <p className="font-medium">Aucun email programmé</p>
              <p className="text-sm">Cliquez sur "Programmer" pour planifier un envoi.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template</TableHead>
                    <TableHead>Destinataire</TableHead>
                    <TableHead>Prévu pour</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheduledEmails.map((email) => (
                    <TableRow key={email.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {getTemplateName(email.template_name)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{email.recipient_email}</p>
                          {email.recipient_name && (
                            <p className="text-xs text-muted-foreground">{email.recipient_name}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {format(new Date(email.scheduled_for), 'dd/MM/yyyy HH:mm', { locale: fr })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {getStatusBadge(email.status)}
                          {email.error_message && (
                            <span className="text-xs text-destructive truncate max-w-[150px]" title={email.error_message}>
                              {email.error_message}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {email.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => cancelScheduledEmail(email.id)}
                            className="gap-1 h-7 text-xs text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                            Annuler
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4 text-sm text-muted-foreground space-y-2">
          <p>
            • <strong>Traitement automatique:</strong> Les emails sont traités par un job planifié toutes les minutes.
          </p>
          <p>
            • <strong>Traitement manuel:</strong> Cliquez sur "Traiter maintenant" pour envoyer les emails en attente immédiatement.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailScheduler;