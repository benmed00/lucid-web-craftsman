import { useState, useEffect } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const PushNotificationManager = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [showPrompt, setShowPrompt] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    if ('Notification' in window && 'serviceWorker' in navigator) {
      setIsSupported(true);
      setPermission(Notification.permission);
      
      // Show prompt after a delay if permission is default
      if (Notification.permission === 'default') {
        const promptShown = localStorage.getItem('notification-prompt-shown');
        const now = Date.now();
        
        // Show prompt if never shown or shown more than 7 days ago
        if (!promptShown || now - parseInt(promptShown) > 7 * 24 * 60 * 60 * 1000) {
          setTimeout(() => {
            setShowPrompt(true);
          }, 5000); // Show after 5 seconds
        }
      }
    }
  }, []);

  const requestPermission = async () => {
    if (!isSupported) return;

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      setShowPrompt(false);
      
      if (result === 'granted') {
        // Subscribe to push notifications
        await subscribeToPush();
        
        // Show welcome notification
        new Notification('Rif Raw Straw', {
          body: 'Vous recevrez maintenant nos notifications pour les nouveautés et offres spéciales!',
          icon: '/favicon.ico',
          tag: 'welcome'
        });
      }
      
      // Mark prompt as shown
      localStorage.setItem('notification-prompt-shown', Date.now().toString());
    } catch (error) {
      console.error('Notification permission error:', error);
    }
  };

  const subscribeToPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // In a real app, you would get this key from your push service
      const publicVapidKey = 'YOUR_VAPID_PUBLIC_KEY'; // Replace with actual key
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicVapidKey
      });
      
      console.log('Push subscription:', subscription);
      
      // Send subscription to your server
      // await fetch('/api/push-subscribe', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(subscription)
      // });
      
    } catch (error) {
      console.error('Push subscription error:', error);
    }
  };

  const dismissPrompt = () => {
    setShowPrompt(false);
    localStorage.setItem('notification-prompt-shown', Date.now().toString());
  };

  if (!isSupported || !showPrompt || permission !== 'default') {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-50 animate-fade-in">
      <Alert className="bg-blue-50 border-blue-200">
        <Bell className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <div className="flex items-center justify-between">
            <div className="flex-1 pr-4">
              <p className="font-medium mb-1">Restez informé</p>
              <p className="text-sm">Activez les notifications pour recevoir nos dernières nouveautés et offres exclusives.</p>
            </div>
            
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={requestPermission}
                className="bg-blue-600 hover:bg-blue-700 text-white h-8"
              >
                Activer
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={dismissPrompt}
                className="text-blue-600 hover:text-blue-700 h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
};