import { useState } from 'react';
import { Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';

interface NewsletterSubscriptionProps {
  variant?: 'footer' | 'popup' | 'inline';
  title?: string;
  description?: string;
}

const NewsletterSubscription = ({
  variant = 'footer',
  title,
  description,
}: NewsletterSubscriptionProps) => {
  const { t } = useTranslation('common');
  const displayTitle = title || t('newsletter.title');
  const displayDescription = description || t('newsletter.description');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error(t('newsletter.errorEmail'));
      return;
    }

    if (!consent) {
      toast.error(t('newsletter.errorConsent'));
      return;
    }

    setIsSubscribing(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      // Use upsert to handle both new subscriptions and reactivations
      // This avoids needing SELECT permission which anonymous users don't have
      const { error } = await supabase.from('newsletter_subscriptions').upsert(
        {
          email: normalizedEmail,
          status: 'active',
          consent_given: true,
          consent_date: new Date().toISOString(),
          source: variant,
          double_opt_in: false,
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: {
            subscription_variant: variant,
            user_agent: navigator.userAgent,
            timestamp: Date.now(),
          },
        },
        {
          onConflict: 'email',
          ignoreDuplicates: false,
        }
      );

      if (error) {
        // Check if it's a duplicate error (email already active)
        if (error.code === '23505') {
          toast.info(t('newsletter.alreadySubscribed'));
        } else {
          throw error;
        }
      } else {
        setIsSubscribed(true);
        setEmail('');
        setConsent(false);
        toast.success(t('newsletter.success'));

        // Reset success state after 5 seconds
        setTimeout(() => setIsSubscribed(false), 5000);
      }
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      toast.error(t('newsletter.errorGeneric'));
    } finally {
      setIsSubscribing(false);
    }
  };

  const renderContent = () => (
    <>
      <div className="mb-6 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 bg-primary/15 dark:bg-primary/20 rounded-full">
            <Mail className="h-6 w-6 text-primary" />
          </div>
        </div>
        <h3 className="font-serif text-xl md:text-2xl font-medium text-foreground mb-2">
          {displayTitle}
        </h3>
        <p className="text-sm md:text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
          {displayDescription}
        </p>
      </div>

      {isSubscribed ? (
        <div className="flex items-center justify-center gap-2 p-4 rounded-xl bg-status-success/15 dark:bg-status-success/20 border border-status-success/20">
          <CheckCircle className="h-5 w-5 text-status-success" />
          <span className="text-sm font-medium text-status-success">
            {t('newsletter.confirmed')}
          </span>
        </div>
      ) : (
        <TooltipProvider>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label
                htmlFor="newsletter-email"
                className={`sr-only ${variant === 'footer' ? 'text-white' : 'text-foreground'}`}
              >
                {t('newsletter.emailLabel')}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="newsletter-email"
                  type="email"
                  placeholder={t('newsletter.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="flex-1 h-12 bg-background dark:bg-muted/50 border-input text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
                  disabled={isSubscribing}
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      tabIndex={
                        isSubscribing || !email.trim() || !consent ? 0 : -1
                      }
                    >
                      <Button
                        type="submit"
                        disabled={isSubscribing || !email.trim() || !consent}
                        className="h-12 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {isSubscribing
                          ? t('newsletter.sending')
                          : t('newsletter.subscribe')}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {!email.trim()
                      ? t('newsletter.tooltipEmail')
                      : !consent
                        ? t('newsletter.tooltipConsent')
                        : t('newsletter.tooltipSubscribe')}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Checkbox
                      id="newsletter-consent"
                      checked={consent}
                      onCheckedChange={(checked) =>
                        setConsent(checked as boolean)
                      }
                      className="mt-0.5 border-input data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left">
                  {t('newsletter.tooltipRequired')}
                </TooltipContent>
              </Tooltip>
              <Label
                htmlFor="newsletter-consent"
                className="text-xs leading-relaxed cursor-pointer text-muted-foreground"
              >
                {t('newsletter.consentText')}{' '}
                <a
                  href="/privacy"
                  className="underline hover:no-underline text-primary"
                >
                  {t('newsletter.privacyPolicy')}
                </a>
                .
              </Label>
            </div>

            {variant !== 'footer' && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>{t('newsletter.unsubscribeNote')}</p>
              </div>
            )}
          </form>
        </TooltipProvider>
      )}
    </>
  );

  if (variant === 'popup') {
    return (
      <Card className="max-w-md">
        <CardContent className="p-6">{renderContent()}</CardContent>
      </Card>
    );
  }

  if (variant === 'inline') {
    return (
      <div className="bg-card dark:bg-card/80 border border-border rounded-2xl p-6 md:p-10 shadow-lg dark:shadow-2xl dark:shadow-black/20">
        {renderContent()}
      </div>
    );
  }

  // Footer variant (default)
  return <div className="space-y-4">{renderContent()}</div>;
};

export default NewsletterSubscription;
