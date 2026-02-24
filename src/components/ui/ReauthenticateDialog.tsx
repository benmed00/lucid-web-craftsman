import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Shield, AlertTriangle } from 'lucide-react';
import { useReauthentication } from '@/hooks/useReauthentication';

interface ReauthenticateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
  actionLabel?: string;
  variant?: 'default' | 'destructive';
}

export const ReauthenticateDialog: React.FC<ReauthenticateDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
  title = 'Confirmation de sécurité requise',
  description = 'Pour effectuer cette action sensible, veuillez confirmer votre identité en entrant votre mot de passe.',
  actionLabel = 'Confirmer',
  variant = 'destructive',
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { reauthenticate, isReauthenticating, userEmail } =
    useReauthentication();

  const handleConfirm = async () => {
    if (!password.trim()) {
      setError('Veuillez entrer votre mot de passe');
      return;
    }

    setError(null);
    const result = await reauthenticate(password);

    if (result.success) {
      setPassword('');
      onOpenChange(false);
      onSuccess();
    } else {
      setError(result.error || 'Échec de la vérification');
    }
  };

  const handleCancel = () => {
    setPassword('');
    setError(null);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {variant === 'destructive' ? (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            ) : (
              <Shield className="h-5 w-5 text-primary" />
            )}
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>{description}</p>
            {userEmail && (
              <p className="text-sm text-muted-foreground">
                Compte: <span className="font-medium">{userEmail}</span>
              </p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reauth-password">Mot de passe</Label>
            <Input
              id="reauth-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              placeholder="Entrez votre mot de passe"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleConfirm();
                }
              }}
              disabled={isReauthenticating}
              className={error ? 'border-destructive' : ''}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={handleCancel}
            disabled={isReauthenticating}
          >
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isReauthenticating || !password.trim()}
            className={
              variant === 'destructive'
                ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
                : ''
            }
          >
            {isReauthenticating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Vérification...
              </>
            ) : (
              actionLabel
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ReauthenticateDialog;
