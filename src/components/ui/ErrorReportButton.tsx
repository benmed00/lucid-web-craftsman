import { useState, useRef } from 'react';
import { AlertTriangle, Send, Upload, X, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Veuillez sélectionner une image');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('L\'image ne doit pas dépasser 5 Mo');
        return;
      }
      setScreenshot(file);
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setScreenshotPreview(previewUrl);
    }
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    if (screenshotPreview) {
      URL.revokeObjectURL(screenshotPreview);
      setScreenshotPreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadScreenshot = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `reports/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('error-screenshots')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return null;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('error-screenshots')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Screenshot upload failed:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.email || !form.description) {
      toast.error('Veuillez remplir tous les champs requis');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Upload screenshot if present
      let screenshotUrl: string | null = null;
      if (screenshot) {
        screenshotUrl = await uploadScreenshot(screenshot);
      }
      
      const reportData = {
        user_id: user?.id || null,
        email: form.email,
        error_type: form.errorType,
        description: form.description,
        screenshot_url: screenshotUrl,
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
      removeScreenshot();
      setIsOpen(false);
    } catch (error: any) {
      console.error('Error submitting report:', error);
      toast.error('Erreur lors de l\'envoi du rapport');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Clean up preview URL when dialog closes
      removeScreenshot();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="bg-destructive/15 border-destructive/30 text-destructive hover:bg-destructive/25 hover:border-destructive/40"
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          Signaler un problème
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-status-error" />
            Signaler un problème
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-2">
            Aidez-nous à améliorer l'application en signalant les bugs ou problèmes que vous rencontrez.
          </DialogDescription>
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
              className="w-full h-10 px-3 py-2 border border-border rounded-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-background text-foreground"
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

          {/* Screenshot Upload */}
          <div className="space-y-2">
            <Label>Capture d'écran (optionnel)</Label>
            
            {!screenshot ? (
              <div 
                className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Cliquez ou glissez une image ici
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG jusqu'à 5 Mo
                </p>
              </div>
            ) : (
              <div className="relative border border-border rounded-lg overflow-hidden">
                <img 
                  src={screenshotPreview || ''} 
                  alt="Capture d'écran" 
                  className="w-full h-32 object-cover"
                />
                <button
                  type="button"
                  onClick={removeScreenshot}
                  className="absolute top-2 right-2 p-1 bg-background/80 rounded-full hover:bg-background transition-colors"
                >
                  <X className="h-4 w-4 text-foreground" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-background/80 px-2 py-1">
                  <p className="text-xs text-foreground truncate flex items-center gap-1">
                    <Image className="h-3 w-3" />
                    {screenshot.name}
                  </p>
                </div>
              </div>
            )}
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
              className="bg-status-error hover:bg-status-error/90 text-background"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
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