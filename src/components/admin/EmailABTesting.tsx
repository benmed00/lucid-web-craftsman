import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import {
  Plus,
  Loader2,
  RefreshCw,
  FlaskConical,
  Play,
  Pause,
  Trophy,
  BarChart3,
  Mail,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ABTest {
  id: string;
  name: string;
  template_name: string;
  status: string;
  variant_a_subject: string | null;
  variant_b_subject: string | null;
  variant_a_sent: number;
  variant_b_sent: number;
  variant_a_opens: number;
  variant_b_opens: number;
  split_percentage: number;
  winner: string | null;
  created_at: string;
  completed_at: string | null;
}

const templateOptions = [
  { value: 'order-confirmation', label: 'Confirmation de commande' },
  { value: 'shipping-notification', label: "Notification d'expédition" },
  { value: 'delivery-confirmation', label: 'Confirmation de livraison' },
  { value: 'cancellation-email', label: 'Annulation / Remboursement' },
];

const EmailABTesting: React.FC = () => {
  const [abTests, setAbTests] = useState<ABTest[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formTemplate, setFormTemplate] = useState('');
  const [formSubjectA, setFormSubjectA] = useState('');
  const [formSubjectB, setFormSubjectB] = useState('');
  const [formSplit, setFormSplit] = useState([50]);

  const fetchABTests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_ab_tests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setAbTests(data || []);
    } catch (error: any) {
      console.error('Error fetching A/B tests:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchABTests();
  }, []);

  const handleSubmit = async () => {
    if (!formName || !formTemplate || !formSubjectA || !formSubjectB) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('email_ab_tests').insert({
        name: formName,
        template_name: formTemplate,
        variant_a_subject: formSubjectA,
        variant_b_subject: formSubjectB,
        split_percentage: formSplit[0],
        status: 'draft',
      });

      if (error) throw error;

      toast.success('Test A/B créé avec succès');
      setDialogOpen(false);
      resetForm();
      fetchABTests();
    } catch (error: any) {
      console.error('Error creating A/B test:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormTemplate('');
    setFormSubjectA('');
    setFormSubjectB('');
    setFormSplit([50]);
  };

  const updateTestStatus = async (id: string, status: string) => {
    try {
      const updateData: any = { status };
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('email_ab_tests')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      toast.success(`Test ${status === 'active' ? 'activé' : 'terminé'}`);
      fetchABTests();
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    }
  };

  const declareWinner = async (id: string, winner: 'a' | 'b') => {
    try {
      const { error } = await supabase
        .from('email_ab_tests')
        .update({
          winner,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      toast.success(`Variante ${winner.toUpperCase()} déclarée gagnante`);
      fetchABTests();
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Brouillon</Badge>;
      case 'active':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Actif
          </Badge>
        );
      case 'completed':
        return <Badge variant="outline">Terminé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTemplateName = (value: string) => {
    return templateOptions.find((t) => t.value === value)?.label || value;
  };

  const calculateWinRate = (sent: number, opens: number) => {
    if (sent === 0) return 0;
    return Math.round((opens / sent) * 100);
  };

  const activeCount = abTests.filter((t) => t.status === 'active').length;

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <FlaskConical className="h-3 w-3" />
            {activeCount} test(s) actif(s)
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchABTests}
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
                Nouveau test
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Créer un test A/B</DialogTitle>
                <DialogDescription>
                  Testez différentes variantes d'objets d'email pour optimiser
                  vos taux d'ouverture.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom du test *</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Test objet commande Q1 2025"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template">Template *</Label>
                  <Select value={formTemplate} onValueChange={setFormTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templateOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="subjectA"
                      className="flex items-center gap-2"
                    >
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-blue-100 text-blue-800 text-xs font-bold">
                        A
                      </span>
                      Objet variante A *
                    </Label>
                    <Input
                      id="subjectA"
                      placeholder="Votre commande est confirmée"
                      value={formSubjectA}
                      onChange={(e) => setFormSubjectA(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="subjectB"
                      className="flex items-center gap-2"
                    >
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-purple-100 text-purple-800 text-xs font-bold">
                        B
                      </span>
                      Objet variante B *
                    </Label>
                    <Input
                      id="subjectB"
                      placeholder="🎉 Commande validée !"
                      value={formSubjectB}
                      onChange={(e) => setFormSubjectB(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <Label>Répartition du trafic</Label>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-blue-600">
                      A: {formSplit[0]}%
                    </span>
                    <Slider
                      value={formSplit}
                      onValueChange={setFormSplit}
                      min={10}
                      max={90}
                      step={10}
                      className="flex-1"
                    />
                    <span className="text-sm font-medium text-purple-600">
                      B: {100 - formSplit[0]}%
                    </span>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="gap-2"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FlaskConical className="h-4 w-4" />
                  )}
                  Créer le test
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* A/B Tests List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : abTests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FlaskConical className="h-12 w-12 mb-4 opacity-50" />
            <p className="font-medium">Aucun test A/B</p>
            <p className="text-sm">
              Créez votre premier test pour optimiser vos emails.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {abTests.map((test) => {
            const rateA = calculateWinRate(
              test.variant_a_sent,
              test.variant_a_opens
            );
            const rateB = calculateWinRate(
              test.variant_b_sent,
              test.variant_b_opens
            );
            const totalSent = test.variant_a_sent + test.variant_b_sent;

            return (
              <Card key={test.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <FlaskConical className="h-4 w-4" />
                        {test.name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Mail className="h-3 w-3" />
                        {getTemplateName(test.template_name)}
                        <span className="text-muted-foreground">•</span>
                        <span>
                          Créé le{' '}
                          {format(new Date(test.created_at), 'dd/MM/yyyy', {
                            locale: fr,
                          })}
                        </span>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(test.status)}
                      {test.winner && (
                        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 gap-1">
                          <Trophy className="h-3 w-3" />
                          {test.winner.toUpperCase()} gagnant
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Variants Comparison */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Variant A */}
                    <div
                      className={`p-4 rounded-lg border-2 ${test.winner === 'a' ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-blue-200 dark:border-blue-800'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-blue-100 text-blue-800 text-sm font-bold">
                          A
                        </span>
                        {test.winner === 'a' && (
                          <Trophy className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                      <p
                        className="text-sm font-medium truncate mb-3"
                        title={test.variant_a_subject || ''}
                      >
                        {test.variant_a_subject}
                      </p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Taux d'ouverture</span>
                          <span className="font-medium">{rateA}%</span>
                        </div>
                        <Progress value={rateA} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{test.variant_a_sent} envoyés</span>
                          <span>{test.variant_a_opens} ouverts</span>
                        </div>
                      </div>
                    </div>

                    {/* Variant B */}
                    <div
                      className={`p-4 rounded-lg border-2 ${test.winner === 'b' ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-purple-200 dark:border-purple-800'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-purple-100 text-purple-800 text-sm font-bold">
                          B
                        </span>
                        {test.winner === 'b' && (
                          <Trophy className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                      <p
                        className="text-sm font-medium truncate mb-3"
                        title={test.variant_b_subject || ''}
                      >
                        {test.variant_b_subject}
                      </p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Taux d'ouverture</span>
                          <span className="font-medium">{rateB}%</span>
                        </div>
                        <Progress value={rateB} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{test.variant_b_sent} envoyés</span>
                          <span>{test.variant_b_opens} ouverts</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Split info */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Répartition:{' '}
                      <strong className="text-blue-600">
                        {test.split_percentage}%
                      </strong>{' '}
                      /{' '}
                      <strong className="text-purple-600">
                        {100 - test.split_percentage}%
                      </strong>
                    </span>
                    <span className="text-muted-foreground">
                      {totalSent} emails envoyés au total
                    </span>
                  </div>

                  {/* Actions */}
                  {test.status !== 'completed' && (
                    <div className="flex gap-2 pt-2 border-t">
                      {test.status === 'draft' && (
                        <Button
                          size="sm"
                          onClick={() => updateTestStatus(test.id, 'active')}
                          className="gap-2"
                        >
                          <Play className="h-4 w-4" />
                          Activer le test
                        </Button>
                      )}
                      {test.status === 'active' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              updateTestStatus(test.id, 'completed')
                            }
                            className="gap-2"
                          >
                            <Pause className="h-4 w-4" />
                            Terminer
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => declareWinner(test.id, 'a')}
                            className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50"
                          >
                            <Trophy className="h-4 w-4" />A gagne
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => declareWinner(test.id, 'b')}
                            className="gap-2 border-purple-300 text-purple-700 hover:bg-purple-50"
                          >
                            <Trophy className="h-4 w-4" />B gagne
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4 text-sm text-muted-foreground space-y-2">
          <p>
            • <strong>Créez un test:</strong> Définissez deux variantes d'objet
            d'email à comparer.
          </p>
          <p>
            • <strong>Activez le test:</strong> Les emails seront
            automatiquement répartis selon le pourcentage défini.
          </p>
          <p>
            • <strong>Analysez les résultats:</strong> Comparez les taux
            d'ouverture et déclarez un gagnant.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailABTesting;
