import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import Navigation from '@/components/Navigation';
import PageFooter from '@/components/PageFooter';

const Unsubscribe = () => {
  const { t } = useTranslation('common');
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleUnsubscribe = async () => {
    if (!email) {
      setStatus('error');
      return;
    }

    setStatus('loading');
    try {
      const { error } = await supabase
        .from('newsletter_subscriptions')
        .update({
          status: 'unsubscribed',
          unsubscribed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('email', email.toLowerCase().trim());

      if (error) throw error;
      setStatus('success');
    } catch (err) {
      console.error('Unsubscribe error:', err);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-20 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-6">
            <div className="p-3 bg-primary/15 rounded-full inline-flex">
              <Mail className="h-8 w-8 text-primary" />
            </div>

            {status === 'success' ? (
              <>
                <CheckCircle className="h-12 w-12 text-status-success mx-auto" />
                <h1 className="font-serif text-2xl font-medium text-foreground">
                  {t('unsubscribe.successTitle', 'Désinscription confirmée')}
                </h1>
                <p className="text-muted-foreground">
                  {t('unsubscribe.successMessage', 'Vous ne recevrez plus notre newsletter. Vous pouvez vous réinscrire à tout moment.')}
                </p>
              </>
            ) : status === 'error' ? (
              <>
                <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
                <h1 className="font-serif text-2xl font-medium text-foreground">
                  {t('unsubscribe.errorTitle', 'Erreur')}
                </h1>
                <p className="text-muted-foreground">
                  {t('unsubscribe.errorMessage', 'Impossible de traiter votre désinscription. Veuillez réessayer ou nous contacter.')}
                </p>
              </>
            ) : (
              <>
                <h1 className="font-serif text-2xl font-medium text-foreground">
                  {t('unsubscribe.title', 'Se désinscrire de la newsletter')}
                </h1>
                <p className="text-muted-foreground">
                  {t('unsubscribe.message', 'Êtes-vous sûr(e) de vouloir vous désinscrire ?')}
                  {email && (
                    <span className="block mt-2 font-medium text-foreground">{email}</span>
                  )}
                </p>
                <Button
                  onClick={handleUnsubscribe}
                  disabled={status === 'loading' || !email}
                  className="w-full"
                >
                  {status === 'loading'
                    ? t('unsubscribe.processing', 'Traitement...')
                    : t('unsubscribe.confirm', 'Confirmer la désinscription')}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </main>
      <PageFooter />
    </div>
  );
};

export default Unsubscribe;
