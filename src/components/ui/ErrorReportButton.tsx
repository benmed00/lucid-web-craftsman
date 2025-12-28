import { useState } from 'react';
import { AlertTriangle, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ErrorReportForm {
  email: string;
  description: string;
  errorType: string;
}

export const ErrorReportButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<ErrorReportForm>({
    email: '',
    description: '',
    errorType: 'bug_report'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.email || !form.description) {
      toast.error('Veuillez remplir tous les champs requis');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const reportData = {
        user_id: user?.id || null,
        email: form.email,
        error_type: form.errorType,
        description: form.description,
        page_url: window.location.href,
        user_agent: navigator.userAgent,
        browser_info: {
          language: navigator.language,
          platform: navigator.platform,
          cookieEnabled: navigator.cookieEnabled,
          onLine: navigator.onLine,
          screen: {
            width: screen.width,
            height: screen.height
          },
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          }
        }
      };

      const { error } = await supabase
        .from('support_tickets_error_reports')
        .insert([reportData]);

      if (error) throw error;

      toast.success('Rapport d\'erreur envoyé avec succès!');
      setForm({ email: '', description: '', errorType: 'bug_report' });
      setIsOpen(false);
    } catch (error: any) {
      console.error('Error submitting report:', error);
      toast.error('Erreur lors de l\'envoi du rapport');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:border-red-300"
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          Signaler un problème
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Signaler un problème
            </DialogTitle>
          </div>
          <p className="text-sm text-stone-600 mt-2">
            Aidez-nous à améliorer l'application en signalant les bugs ou problèmes que vous rencontrez.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="error-email">Email de contact *</Label>
            <Input
              id="error-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
              placeholder="votre@email.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="error-type">Type de problème</Label>
            <select
              id="error-type"
              value={form.errorType}
              onChange={(e) => setForm(prev => ({ ...prev, errorType: e.target.value }))}
              className="w-full h-10 px-3 py-2 border border-border rounded-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-background"
            >
              <option value="bug_report">Bug / Erreur</option>
              <option value="ui_issue">Problème d'interface</option>
              <option value="performance">Problème de performance</option>
              <option value="feature_request">Demande de fonctionnalité</option>
              <option value="other">Autre</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="error-description">Description du problème *</Label>
            <Textarea
              id="error-description"
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Décrivez le problème en détail : que faisiez-vous quand c'est arrivé ? Quel était le comportement attendu ?"
              rows={4}
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Envoi...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Envoyer le rapport
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};