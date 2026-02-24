import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Mail,
  Smartphone,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Send,
  Shield,
} from 'lucide-react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { toast } from 'sonner';
import {
  validateAndSanitizeEmail,
  validatePhoneNumber,
} from '@/utils/xssProtection';

interface OTPAuthFlowProps {
  mode: 'signin' | 'signup' | 'reset';
  onSuccess?: () => void;
  onBack?: () => void;
}

export const OTPAuthFlow: React.FC<OTPAuthFlowProps> = ({
  mode,
  onSuccess,
  onBack,
}) => {
  const [step, setStep] = useState<'contact' | 'verify'>('contact');
  const [method, setMethod] = useState<'email' | 'sms'>('email');
  const [contact, setContact] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [maxAttempts] = useState(3);

  const { signInWithOtp, verifyOtp, resetPassword } = useOptimizedAuth();

  // Countdown timer for resend
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const handleSendOTP = useCallback(async () => {
    if (attempts >= maxAttempts) {
      toast.error(
        'Nombre maximum de tentatives atteint. Veuillez réessayer plus tard.'
      );
      return;
    }

    try {
      setIsLoading(true);

      if (method === 'email') {
        const sanitizedEmail = validateAndSanitizeEmail(contact);

        if (mode === 'reset') {
          await resetPassword(sanitizedEmail);
          toast.success('Email de réinitialisation envoyé');
        } else {
          await signInWithOtp(sanitizedEmail, {
            shouldCreateUser: mode === 'signup',
          });
          toast.success('Code OTP envoyé par email');
        }
      } else {
        // SMS OTP implementation would go here
        const sanitizedPhone = validatePhoneNumber(contact);
        toast.info('Fonctionnalité SMS à venir');
        return;
      }

      setStep('verify');
      setTimeLeft(60); // 1 minute cooldown
      setAttempts((prev) => prev + 1);
    } catch (error: any) {
      console.error('OTP send error:', error);
      toast.error(error.message || "Erreur lors de l'envoi du code");
    } finally {
      setIsLoading(false);
    }
  }, [
    contact,
    method,
    mode,
    attempts,
    maxAttempts,
    signInWithOtp,
    resetPassword,
  ]);

  const handleVerifyOTP = useCallback(async () => {
    try {
      setIsLoading(true);

      if (method === 'email') {
        const sanitizedEmail = validateAndSanitizeEmail(contact);
        await verifyOtp(sanitizedEmail, otp, 'email');

        toast.success('Authentification réussie !');
        onSuccess?.();
      }
    } catch (error: any) {
      console.error('OTP verify error:', error);
      toast.error(error.message || 'Code OTP invalide');
    } finally {
      setIsLoading(false);
    }
  }, [contact, otp, method, verifyOtp, onSuccess]);

  const getTitle = () => {
    switch (mode) {
      case 'signin':
        return 'Connexion par code';
      case 'signup':
        return 'Inscription par code';
      case 'reset':
        return 'Réinitialiser le mot de passe';
      default:
        return 'Authentification';
    }
  };

  const getDescription = () => {
    if (step === 'verify') {
      return `Entrez le code reçu par ${method === 'email' ? 'email' : 'SMS'}`;
    }

    switch (mode) {
      case 'signin':
        return 'Connectez-vous avec un code de sécurité';
      case 'signup':
        return 'Créez votre compte avec un code de sécurité';
      case 'reset':
        return 'Recevez un lien de réinitialisation';
      default:
        return "Méthode d'authentification sécurisée";
    }
  };

  if (step === 'contact') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-2">
            {onBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="absolute left-4"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>{getTitle()}</CardTitle>
          <CardDescription>{getDescription()}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Method Selection */}
          {mode !== 'reset' && (
            <div className="space-y-3">
              <Label>Méthode d'authentification</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={method === 'email' ? 'default' : 'outline'}
                  onClick={() => setMethod('email')}
                  className="flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Email
                </Button>
                <Button
                  variant={method === 'sms' ? 'default' : 'outline'}
                  onClick={() => setMethod('sms')}
                  className="flex items-center gap-2"
                  disabled // SMS not implemented yet
                >
                  <Smartphone className="h-4 w-4" />
                  SMS
                  <Badge variant="secondary" className="ml-1 text-xs">
                    Bientôt
                  </Badge>
                </Button>
              </div>
            </div>
          )}

          {/* Contact Input */}
          <div className="space-y-2">
            <Label htmlFor="contact">
              {method === 'email' ? 'Adresse email' : 'Numéro de téléphone'}
            </Label>
            <Input
              id="contact"
              type={method === 'email' ? 'email' : 'tel'}
              placeholder={
                method === 'email' ? 'votre@email.com' : '+33 6 12 34 56 78'
              }
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              required
            />
          </div>

          {/* Rate Limiting Warning */}
          {attempts > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Tentatives restantes: {maxAttempts - attempts}
              </AlertDescription>
            </Alert>
          )}

          {/* Send Button */}
          <Button
            onClick={handleSendOTP}
            disabled={isLoading || !contact || attempts >= maxAttempts}
            className="w-full"
          >
            {isLoading ? (
              'Envoi en cours...'
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Envoyer le code
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Verify step
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep('contact')}
            className="absolute left-4"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CheckCircle className="h-8 w-8 text-green-500" />
        </div>
        <CardTitle>Vérification</CardTitle>
        <CardDescription>{getDescription()}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Contact Display */}
        <div className="text-center p-4 bg-muted rounded-lg">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            {method === 'email' ? (
              <Mail className="h-4 w-4" />
            ) : (
              <Smartphone className="h-4 w-4" />
            )}
            Code envoyé à: <strong>{contact}</strong>
          </div>
        </div>

        {/* OTP Input */}
        <div className="space-y-2">
          <Label htmlFor="otp">Code de vérification</Label>
          <Input
            id="otp"
            type="text"
            placeholder="123456"
            value={otp}
            onChange={(e) =>
              setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
            }
            maxLength={6}
            className="text-center text-lg tracking-widest"
            autoComplete="one-time-code"
          />
        </div>

        {/* Verify Button */}
        <Button
          onClick={handleVerifyOTP}
          disabled={isLoading || otp.length < 6}
          className="w-full"
        >
          {isLoading ? 'Vérification...' : 'Vérifier le code'}
        </Button>

        {/* Resend Section */}
        <div className="text-center space-y-2">
          {timeLeft > 0 ? (
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Clock className="h-4 w-4" />
              Renvoyer dans {timeLeft}s
            </p>
          ) : (
            <Button
              variant="ghost"
              onClick={handleSendOTP}
              disabled={isLoading || attempts >= maxAttempts}
              className="text-sm"
            >
              Renvoyer le code
            </Button>
          )}
        </div>

        {/* Help Text */}
        <div className="text-center text-xs text-muted-foreground">
          <p>Vous n'avez pas reçu le code ?</p>
          <p>Vérifiez votre dossier spam ou réessayez.</p>
        </div>
      </CardContent>
    </Card>
  );
};
