import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import NewsletterSubscription from '@/components/NewsletterSubscription';
import { useTranslation } from 'react-i18next';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

const STORAGE_KEY = 'newsletter_exit_intent_dismissed';
const SUBSCRIBED_KEY = 'newsletter_subscribed';
const DISMISS_DAYS = 7;

/** Paths where exit-intent must never run (purchase funnel, post-pay, ops). */
function isPurchaseOrSensitivePath(pathname: string): boolean {
  return (
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/cart') ||
    pathname.startsWith('/payment-success') ||
    pathname.startsWith('/order-confirmation') ||
    pathname.startsWith('/payment') ||
    pathname.startsWith('/admin')
  );
}

const NewsletterExitIntent = () => {
  const { t } = useTranslation('common');
  const { user } = useOptimizedAuth();
  const { pathname } = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const shouldSuppress = useCallback(() => {
    if (isPurchaseOrSensitivePath(pathname)) return true;

    if (user) return true;

    try {
      if (localStorage.getItem(SUBSCRIBED_KEY) === 'true') return true;
    } catch {
      /* ignore */
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const dismissedAt = parseInt(raw, 10);
      const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
      return daysSince < DISMISS_DAYS;
    } catch {
      return false;
    }
  }, [user, pathname]);

  const dismiss = useCallback(() => {
    setIsOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (shouldSuppress()) {
      setIsOpen(false);
      return;
    }

    let triggered = false;
    let mouseHandler: ((e: MouseEvent) => void) | null = null;

    const delayId = window.setTimeout(() => {
      mouseHandler = (e: MouseEvent) => {
        if (e.clientY > 5 || triggered) return;
        // Fresh pathname — user may have navigated to checkout during the 5s delay
        if (isPurchaseOrSensitivePath(window.location.pathname)) return;
        triggered = true;
        setIsOpen(true);
        if (mouseHandler) {
          document.removeEventListener('mouseout', mouseHandler);
        }
      };
      document.addEventListener('mouseout', mouseHandler);
    }, 5000);

    return () => {
      window.clearTimeout(delayId);
      if (mouseHandler) {
        document.removeEventListener('mouseout', mouseHandler);
      }
    };
  }, [shouldSuppress]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) dismiss();
      }}
    >
      <DialogContent className="sm:max-w-md p-0 gap-0 border-border bg-background overflow-hidden">
        <VisuallyHidden>
          <DialogTitle>
            {t('newsletter.exitIntent.title', 'Newsletter')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'newsletter.exitIntent.description',
              'Subscribe to our newsletter'
            )}
          </DialogDescription>
        </VisuallyHidden>
        <div className="p-6 pt-8">
          <NewsletterSubscription
            variant="popup"
            title={t('newsletter.exitIntent.title')}
            description={t('newsletter.exitIntent.description')}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewsletterExitIntent;
