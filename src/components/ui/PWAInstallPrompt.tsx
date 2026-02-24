import { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';

interface PWAInstallPromptProps {
  onInstall?: () => void;
  onDismiss?: () => void;
}

export const PWAInstallPrompt = ({
  onInstall,
  onDismiss,
}: PWAInstallPromptProps) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia(
      '(display-mode: standalone)'
    ).matches;
    const isIOSStandalone = (window.navigator as any).standalone === true;

    if (isStandalone || isIOSStandalone) {
      setIsInstalled(true);
      return;
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('PWA: beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);

      // Show prompt after a delay (better UX)
      setTimeout(() => {
        const dismissed = localStorage.getItem('pwa-install-dismissed');
        const lastShown = localStorage.getItem('pwa-install-last-shown');
        const now = Date.now();

        // Don't show if dismissed in last 7 days
        if (dismissed && now - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) {
          return;
        }

        // Don't show if shown in last 24 hours
        if (lastShown && now - parseInt(lastShown) < 24 * 60 * 60 * 1000) {
          return;
        }

        setShowPrompt(true);
        localStorage.setItem('pwa-install-last-shown', now.toString());
      }, 3000);
    };

    // Check if app is installed
    const handleAppInstalled = () => {
      console.log('PWA: App installed');
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      // Show the install prompt
      deferredPrompt.prompt();

      // Wait for the user to respond
      const { outcome } = await deferredPrompt.userChoice;
      console.log('PWA: User choice:', outcome);

      if (outcome === 'accepted') {
        onInstall?.();
      }

      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error('PWA: Install failed:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    onDismiss?.();
  };

  // Don't show if not installable or already installed
  if (!isInstallable || isInstalled || !showPrompt || !isMobile) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 animate-fade-in">
      <Card className="bg-card border border-border shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 bg-secondary p-2 rounded-full">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-sm mb-1">
                Installer l'application
              </h3>
              <p className="text-muted-foreground text-xs leading-relaxed mb-3">
                Ajoutez Rif Raw Straw à votre écran d'accueil pour un accès
                rapide et une expérience optimisée.
              </p>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleInstallClick}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs px-3 py-2 h-auto"
                >
                  <Download className="h-3 w-3 mr-1.5" />
                  Installer
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismiss}
                  className="text-muted-foreground hover:text-foreground text-xs px-3 py-2 h-auto"
                >
                  Plus tard
                </Button>
              </div>
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 h-auto w-auto text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
