import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface ReauthResult {
  success: boolean;
  error?: string;
}

export const useReauthentication = () => {
  const { user } = useAuth();
  const [isReauthenticating, setIsReauthenticating] = useState(false);

  const reauthenticate = useCallback(
    async (password: string): Promise<ReauthResult> => {
      if (!user?.email) {
        return { success: false, error: 'Utilisateur non connecté' };
      }

      setIsReauthenticating(true);

      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: user.email,
          password,
        });

        if (error) {
          return { success: false, error: 'Mot de passe incorrect' };
        }

        return { success: true };
      } catch (err) {
        console.error('Re-authentication error:', err);
        return { success: false, error: 'Erreur de vérification' };
      } finally {
        setIsReauthenticating(false);
      }
    },
    [user]
  );

  const withReauth = useCallback(
    async <T>(
      password: string,
      action: () => Promise<T>,
      actionName: string = 'action'
    ): Promise<{ success: boolean; result?: T; error?: string }> => {
      const reauthResult = await reauthenticate(password);

      if (!reauthResult.success) {
        toast.error(`Échec de la re-authentification: ${reauthResult.error}`);
        return { success: false, error: reauthResult.error };
      }

      try {
        const result = await action();
        toast.success(`${actionName} effectuée avec succès`);
        return { success: true, result };
      } catch (err: any) {
        const errorMessage = err.message || 'Erreur inconnue';
        toast.error(`Échec: ${errorMessage}`);
        return { success: false, error: errorMessage };
      }
    },
    [reauthenticate]
  );

  return {
    reauthenticate,
    withReauth,
    isReauthenticating,
    userEmail: user?.email,
  };
};
