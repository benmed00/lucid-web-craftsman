import { useState, useEffect } from 'react';
import { Bell, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/stores';
import { useTranslation } from 'react-i18next';

const VISIT_COUNT_KEY = 'rrs-visit-count';
const NOTIFICATION_PROMPT_KEY = 'notification-prompt-shown';

export const PushNotificationManager = () => {
  const { t } = useTranslation('common');
  const { itemCount } = useCart();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [showPrompt, setShowPrompt] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Track visit count
    const visitCount = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || '0', 10);
    localStorage.setItem(VISIT_COUNT_KEY, (visitCount + 1).toString());

    // Check if notifications are supported
    if ('Notification' in window && 'serviceWorker' in navigator) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    // Only show if:
    // 1. Notifications are supported
    // 2. Permission is still 'default' (not granted or denied)
    // 3. User has items in cart
    // 4. This is at least the second visit
    // 5. Prompt hasn't been shown in the last 7 days
    
    if (!isSupported || permission !== 'default') {
      setShowPrompt(false);
      return;
    }

    const visitCount = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || '0', 10);
    const promptShown = localStorage.getItem(NOTIFICATION_PROMPT_KEY);
    const now = Date.now();
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

    const isSecondVisitOrMore = visitCount >= 2;
    const hasItemsInCart = itemCount > 0;
    const promptNotRecentlyShown = !promptShown || parseInt(promptShown) < sevenDaysAgo;

    if (isSecondVisitOrMore && hasItemsInCart && promptNotRecentlyShown) {
      // Delay showing for a smoother experience
      const timer = setTimeout(() => {
        setShowPrompt(true);
        // Animate in
        requestAnimationFrame(() => setIsVisible(true));
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      setShowPrompt(false);
    }
  }, [isSupported, permission, itemCount]);

  const requestPermission = async () => {
    if (!isSupported) return;

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      dismissPrompt();
      
      if (result === 'granted') {
        await subscribeToPush();
        
        new Notification('Rif Raw Straw', {
          body: t('notifications.welcomeMessage', 'Vous recevrez maintenant nos notifications pour les nouveautés et offres spéciales!'),
          icon: '/favicon.ico',
          tag: 'welcome'
        });
      }
    } catch (error) {
      console.error('Notification permission error:', error);
    }
  };

  const subscribeToPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const publicVapidKey = 'YOUR_VAPID_PUBLIC_KEY';
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicVapidKey
      });
      
      console.log('Push subscription:', subscription);
    } catch (error) {
      console.error('Push subscription error:', error);
    }
  };

  const dismissPrompt = () => {
    setIsVisible(false);
    setTimeout(() => {
      setShowPrompt(false);
      localStorage.setItem(NOTIFICATION_PROMPT_KEY, Date.now().toString());
    }, 300);
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div 
      className={`fixed bottom-6 right-6 z-50 max-w-sm transition-all duration-300 ease-out ${
        isVisible 
          ? 'opacity-100 translate-y-0 scale-100' 
          : 'opacity-0 translate-y-4 scale-95'
      }`}
    >
      <div className="relative overflow-hidden rounded-2xl bg-card border border-border shadow-2xl dark:shadow-black/40">
        {/* Decorative gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/10 pointer-events-none" />
        
        {/* Close button */}
        <button
          onClick={dismissPrompt}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          aria-label={t('common.close', 'Fermer')}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative p-5">
          {/* Icon with animated background */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg animate-pulse" />
              <div className="relative p-2.5 bg-primary/10 rounded-full">
                <Bell className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                {t('notifications.exclusive', 'Exclusif')}
              </span>
            </div>
          </div>

          {/* Content */}
          <h3 className="font-serif text-lg font-semibold text-foreground mb-2">
            {t('notifications.title', 'Restez informé')}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-5">
            {t('notifications.description', 'Recevez nos offres exclusives et les dernières nouveautés directement.')}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button
              onClick={requestPermission}
              size="sm"
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-md hover:shadow-lg transition-all"
            >
              <Bell className="h-4 w-4 mr-2" />
              {t('notifications.enable', 'Activer')}
            </Button>
            <Button
              onClick={dismissPrompt}
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
            >
              {t('notifications.later', 'Plus tard')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
