import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';

interface OfflineManagerProps {
  children: React.ReactNode;
}

export const OfflineManager = ({ children }: OfflineManagerProps) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineAlert, setShowOfflineAlert] = useState(false);
  const [offlineActions, setOfflineActions] = useState<any[]>([]);

  useEffect(() => {
    const handleOnline = () => {
      console.log('App: Back online');
      setIsOnline(true);
      setShowOfflineAlert(false);
      
      toast({
        title: "Connexion rétablie",
        description: "Vous êtes de nouveau en ligne",
      });

      // Sync offline actions
      syncOfflineActions();
    };

    const handleOffline = () => {
      console.log('App: Gone offline');
      setIsOnline(false);
      setShowOfflineAlert(true);
      
      toast({
        title: "Mode hors ligne",
        description: "Vous pouvez continuer à naviguer, certaines fonctionnalités sont limitées",
        variant: "destructive"
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial state
    if (!navigator.onLine) {
      setShowOfflineAlert(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncOfflineActions = async () => {
    try {
      const stored = localStorage.getItem('offline-cart-actions');
      if (stored) {
        const actions = JSON.parse(stored);
        console.log('Syncing offline actions:', actions);
        
        // For now, just simulate sync since background sync isn't universally supported
        // In a real app, you would send these to your server
        setTimeout(() => {
          console.log('Offline actions synced successfully');
        }, 1000);
        
        // Clear local storage after sync
        localStorage.removeItem('offline-cart-actions');
        setOfflineActions([]);
      }
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  const addOfflineAction = (action: any) => {
    const newActions = [...offlineActions, { ...action, timestamp: Date.now() }];
    setOfflineActions(newActions);
    localStorage.setItem('offline-cart-actions', JSON.stringify(newActions));
  };

  const retryConnection = () => {
    // Force a network request to check connectivity
    fetch('/manifest.json', { cache: 'no-cache' })
      .then(() => {
        setIsOnline(true);
        setShowOfflineAlert(false);
        syncOfflineActions();
      })
      .catch(() => {
        toast({
          title: "Toujours hors ligne",
          description: "Vérifiez votre connexion internet",
          variant: "destructive"
        });
      });
  };

  return (
    <div className="min-h-screen">
      {/* Offline Alert - Mobile optimized */}
      {showOfflineAlert && (
        <Alert className="fixed top-0 left-0 right-0 z-[60] rounded-none border-0 bg-amber-50 border-b border-amber-200">
          <WifiOff className="h-4 w-4 text-amber-600" />
          <AlertDescription className="flex-1 text-amber-800">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm">Mode hors ligne - Fonctionnalités limitées</span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={retryConnection}
                  className="text-amber-700 hover:text-amber-800 h-auto py-1 px-2 text-xs"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Réessayer
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowOfflineAlert(false)}
                  className="text-amber-700 hover:text-amber-800 h-auto py-1 px-1"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Online Status Indicator */}
      <div className={`fixed top-4 right-4 z-40 transition-all duration-300 ${
        isOnline ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}>
        <div className="bg-red-500 text-white px-3 py-2 rounded-full text-sm flex items-center shadow-lg">
          <WifiOff className="h-4 w-4 mr-2" />
          Hors ligne
        </div>
      </div>

      {/* Main Content */}
      <div className={showOfflineAlert ? 'pt-12' : ''}>
        {children}
      </div>
    </div>
  );
};