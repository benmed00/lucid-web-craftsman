import { useState } from 'react';
import { Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NewsletterSubscriptionProps {
  variant?: 'footer' | 'popup' | 'inline';
  title?: string;
  description?: string;
}

const NewsletterSubscription = ({ 
  variant = 'footer',
  title = "Restez informé",
  description = "Recevez nos dernières créations et actualités artisanales"
}: NewsletterSubscriptionProps) => {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error('Veuillez saisir votre adresse email');
      return;
    }

    if (!consent) {
      toast.error('Veuillez accepter les conditions pour vous abonner');
      return;
    }

    setIsSubscribing(true);

    try {
      // Check if email already exists
      const { data: existing } = await supabase
        .from('newsletter_subscriptions')
        .select('id, status')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (existing) {
        if (existing.status === 'active') {
          toast.error('Cette adresse email est déjà abonnée à notre newsletter');
          setIsSubscribing(false);
          return;
        } else {
          // Reactivate subscription
          const { error } = await supabase
            .from('newsletter_subscriptions')
            .update({
              status: 'active',
              consent_given: true,
              consent_date: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);

          if (error) throw error;
        }
      } else {
        // Create new subscription
        const { error } = await supabase
          .from('newsletter_subscriptions')
          .insert({
            email: email.trim().toLowerCase(),
            status: 'active',
            consent_given: true,
            consent_date: new Date().toISOString(),
            source: variant,
            double_opt_in: false, // Simple opt-in for now
            confirmed_at: new Date().toISOString(),
            metadata: {
              subscription_variant: variant,
              user_agent: navigator.userAgent,
              timestamp: Date.now()
            }
          });

        if (error) throw error;
      }

      setIsSubscribed(true);
      setEmail('');
      setConsent(false);
      toast.success('Merci ! Vous êtes maintenant abonné à notre newsletter.');
      
      // Reset success state after 5 seconds
      setTimeout(() => setIsSubscribed(false), 5000);

    } catch (error) {
      console.error('Newsletter subscription error:', error);
      toast.error('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSubscribing(false);
    }
  };

  const renderContent = () => (
    <>
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Mail className="h-5 w-5 text-olive-700" />
          <h3 className={`font-medium ${variant === 'footer' ? 'text-white' : 'text-stone-800'}`}>
            {title}
          </h3>
        </div>
        <p className={`text-sm ${variant === 'footer' ? 'text-stone-300' : 'text-stone-600'}`}>
          {description}
        </p>
      </div>

      {isSubscribed ? (
        <div className={`flex items-center gap-2 p-3 rounded-lg ${
          variant === 'footer' ? 'bg-white/10' : 'bg-green-50'
        }`}>
          <CheckCircle className={`h-5 w-5 ${
            variant === 'footer' ? 'text-green-300' : 'text-green-600'
          }`} />
          <span className={`text-sm font-medium ${
            variant === 'footer' ? 'text-green-200' : 'text-green-800'
          }`}>
            Inscription confirmée !
          </span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label 
              htmlFor="newsletter-email" 
              className={`sr-only ${variant === 'footer' ? 'text-white' : 'text-stone-700'}`}
            >
              Adresse email
            </Label>
            <div className="flex gap-2">
              <Input
                id="newsletter-email"
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={`flex-1 ${variant === 'footer' 
                  ? 'bg-white/10 border-white/20 text-white placeholder:text-white/60' 
                  : 'bg-white border-stone-300'
                }`}
                disabled={isSubscribing}
              />
              <Button
                type="submit"
                disabled={isSubscribing || !email.trim() || !consent}
                className={`px-6 ${variant === 'footer'
                  ? 'bg-white text-olive-700 hover:bg-white/90'
                  : 'bg-olive-700 hover:bg-olive-800 text-white'
                }`}
              >
                {isSubscribing ? '...' : 'Abonner'}
              </Button>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="newsletter-consent"
              checked={consent}
              onCheckedChange={(checked) => setConsent(checked as boolean)}
              className={variant === 'footer' ? 'border-white/40 data-[state=checked]:bg-white data-[state=checked]:text-olive-700' : ''}
            />
            <Label
              htmlFor="newsletter-consent"
              className={`text-xs leading-relaxed cursor-pointer ${
                variant === 'footer' ? 'text-stone-300' : 'text-stone-600'
              }`}
            >
              J'accepte de recevoir la newsletter de Rif Raw Straw et confirme avoir lu la{' '}
              <a href="/privacy" className={`underline hover:no-underline ${
                variant === 'footer' ? 'text-white' : 'text-olive-700'
              }`}>
                politique de confidentialité
              </a>
              .
            </Label>
          </div>

          {variant !== 'footer' && (
            <div className="flex items-start gap-2 text-xs text-stone-500">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>
                Vous pouvez vous désabonner à tout moment en cliquant sur le lien de désinscription 
                présent dans chaque email.
              </p>
            </div>
          )}
        </form>
      )}
    </>
  );

  if (variant === 'popup') {
    return (
      <Card className="max-w-md">
        <CardContent className="p-6">
          {renderContent()}
        </CardContent>
      </Card>
    );
  }

  if (variant === 'inline') {
    return (
      <div className="bg-olive-50 border border-olive-200 rounded-lg p-6">
        {renderContent()}
      </div>
    );
  }

  // Footer variant (default)
  return (
    <div className="space-y-4">
      {renderContent()}
    </div>
  );
};

export default NewsletterSubscription;