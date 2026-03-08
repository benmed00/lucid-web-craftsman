import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import NewsletterSubscription from '@/components/NewsletterSubscription';
import { useTranslation } from 'react-i18next';

const STORAGE_KEY = 'newsletter_exit_intent_dismissed';
const DISMISS_DAYS = 7;

const NewsletterExitIntent = () => {
  const { t } = useTranslation('common');
  const [isOpen, setIsOpen] = useState(false);

  const isDismissed = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const dismissedAt = parseInt(raw, 10);
      const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
      return daysSince < DISMISS_DAYS;
    } catch {
      return false;
    }
  }, []);

  const dismiss = useCallback(() => {
    setIsOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (isDismissed()) return;

    let triggered = false;
    const delay = setTimeout(() => {
      const handleMouseLeave = (e: MouseEvent) => {
        if (e.clientY <= 5 && !triggered) {
          triggered = true;
          setIsOpen(true);
          document.removeEventListener('mouseout', handleMouseLeave);
        }
      };
      document.addEventListener('mouseout', handleMouseLeave);

      return () => document.removeEventListener('mouseout', handleMouseLeave);
    }, 5000); // wait 5s before arming

    return () => clearTimeout(delay);
  }, [isDismissed]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) dismiss(); }}>
      <DialogContent className="sm:max-w-md p-0 gap-0 border-border bg-background overflow-hidden">
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
