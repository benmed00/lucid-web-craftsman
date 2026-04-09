import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function LogoutPage() {
  useEffect(() => {
    const logout = async () => {
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch {
        // ignore — force cleanup regardless
      }

      // Full cleanup
      try {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('sb-') || key.startsWith('supabase.auth.') || key === 'guest_session') {
            localStorage.removeItem(key);
          }
        });
        sessionStorage.clear();
      } catch {
        // private mode
      }

      window.location.href = '/';
    };

    logout();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-lg text-muted-foreground animate-pulse">Déconnexion en cours…</p>
    </div>
  );
}
