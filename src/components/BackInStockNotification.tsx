import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { insertBackInStockNotification } from '@/services/backInStockApi';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface BackInStockNotificationProps {
  productId: number;
  productName: string;
}

export const BackInStockNotification: React.FC<
  BackInStockNotificationProps
> = ({ productId, productName }) => {
  const { t } = useTranslation('pages');
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubscribe = async () => {
    if (!email) return;

    setIsSubmitting(true);
    try {
      const { error } = await insertBackInStockNotification({
        product_id: productId,
        email,
        user_id: user?.id || null,
        status: 'active',
      });

      if (error) {
        if (error.code === '23505') {
          toast.info(t('productDetail.backInStock.alreadySubscribed'));
        } else {
          throw error;
        }
      } else {
        setIsSubscribed(true);
        toast.success(t('productDetail.backInStock.success'));
      }
    } catch (err) {
      console.error('Back-in-stock subscription error:', err);
      toast.error(t('productDetail.backInStock.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubscribed) {
    return (
      <Alert className="border-primary/30 bg-primary/5">
        <AlertDescription className="flex items-center gap-2 text-sm">
          <CheckCircle className="h-4 w-4 text-primary shrink-0" />
          <span>{t('productDetail.backInStock.confirmed')}</span>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-primary" />
        <p className="text-sm font-medium text-foreground">
          {t('productDetail.backInStock.title')}
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        {t('productDetail.backInStock.description', { name: productName })}
      </p>
      <div className="flex gap-2">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('productDetail.backInStock.emailPlaceholder')}
          className="text-sm h-9"
          aria-label={t('productDetail.backInStock.emailAria')}
        />
        <Button
          size="sm"
          onClick={handleSubscribe}
          disabled={!email || isSubmitting}
          className="shrink-0 h-9"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            t('productDetail.backInStock.notify')
          )}
        </Button>
      </div>
    </div>
  );
};
