import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useOptimizedAuth } from '@/context/AuthContext';
import { useCsrfToken } from '@/hooks/useCsrfToken';
import { Eye, EyeOff, CheckCircle2, ArrowLeft } from 'lucide-react';
import {
  validateAndSanitizeEmail,
  validateAndSanitizeName,
  validatePassword,
} from '@/utils/xssProtection';
import { createRateLimiter } from '@/utils/validation';
import { OTPAuthFlow } from '@/components/auth/OTPAuthFlow';
import authHeroWebp from '@/assets/auth-hero.webp';
import authHeroJpg from '@/assets/auth-hero.jpg';

const authRateLimiter = createRateLimiter(5, 15 * 60 * 1000);

type AuthView =
  | 'signin'
  | 'signup'
  | 'forgot'
  | 'otp-signin'
  | 'otp-signup'
  | 'otp-reset';

export default function Auth() {
  const { t, i18n } = useTranslation(['auth', 'common']);
  const isFr = (i18n.language?.split('-')[0] ?? 'fr') === 'fr';

  const [view, setView] = useState<AuthView>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  // Phone is not captured in the current UI; reserved for a future onboarding step.
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, signUp, user } = useOptimizedAuth();
  const { csrfToken } = useCsrfToken();

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const clientId = navigator.userAgent + window.location.hostname;
    if (!authRateLimiter(clientId)) {
      toast({
        title: t('auth:errors.tooManyAttempts'),
        variant: 'destructive',
      });
      return;
    }
    try {
      const sanitizedEmail = validateAndSanitizeEmail(email);
      if (!password) throw new Error(t('auth:errors.passwordRequired'));
      setIsLoading(true);
      await signIn(sanitizedEmail, password);
      toast({
        title: t('auth:messages.loggedIn'),
        description: t('auth:messages.welcome'),
      });
    } catch (error: unknown) {
      toast({
        title: t('auth:errors.invalidCredentials'),
        description:
          error instanceof Error ? error.message : String(error ?? ''),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const clientId = navigator.userAgent + window.location.hostname;
    if (!authRateLimiter(clientId)) {
      toast({
        title: t('auth:errors.tooManyAttempts'),
        variant: 'destructive',
      });
      return;
    }
    try {
      const sanitizedEmail = validateAndSanitizeEmail(email);
      const sanitizedFullName = validateAndSanitizeName(fullName);
      validatePassword(password);
      if (password !== confirmPassword)
        throw new Error(t('auth:errors.passwordMismatch'));
      setIsLoading(true);
      const result = await signUp(
        sanitizedEmail,
        password,
        sanitizedFullName,
        undefined
      );
      if (
        result.user &&
        result.user.identities &&
        result.user.identities.length === 0
      ) {
        toast({
          title: t('auth:errors.emailAlreadyUsed', 'Email déjà utilisé'),
          description: t(
            'auth:errors.emailAlreadyUsedDescription',
            'Un compte avec cet email existe déjà.'
          ),
          variant: 'destructive',
        });
        return;
      }
      if (result.user && !result.session) {
        toast({
          title: t('auth:messages.confirmEmail', 'Vérifiez votre email'),
          description: t(
            'auth:messages.confirmEmailDescription',
            'Un lien de confirmation a été envoyé.'
          ),
          duration: 10000,
        });
      } else {
        toast({
          title: t('auth:messages.accountCreated'),
          description: t('auth:messages.welcome'),
        });
      }
    } catch (error: unknown) {
      toast({
        title: t('auth:errors.networkError'),
        description:
          error instanceof Error ? error.message : String(error ?? ''),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPSuccess = () => {
    setView('signin');
    navigate('/');
  };

  // OTP flows
  if (view === 'otp-signin' || view === 'otp-signup' || view === 'otp-reset') {
    const mode =
      view === 'otp-signin'
        ? 'signin'
        : view === 'otp-signup'
          ? 'signup'
          : 'reset';
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-fade-in">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-serif font-bold text-foreground mb-2">
              Rif Raw Straw
            </h1>
            <p className="text-muted-foreground text-sm tracking-wider uppercase">
              {isFr
                ? 'Artisanat Berbère Authentique'
                : 'Authentic Berber Craftsmanship'}
            </p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
            <OTPAuthFlow
              mode={mode}
              onSuccess={handleOTPSuccess}
              onBack={() => setView('signin')}
            />
          </div>
        </div>
      </div>
    );
  }

  const isSignUp = view === 'signup';

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] flex flex-col lg:flex-row">
      {/* ═══ LEFT — Visual storytelling (hidden on mobile) ═══ */}
      <div className="hidden lg:flex lg:w-[48%] xl:w-[45%] relative overflow-hidden">
        <picture className="absolute inset-0 block">
          <source srcSet={authHeroWebp} type="image/webp" />
          <img
            src={authHeroJpg}
            alt={
              isFr
                ? 'Artisanat marocain en paille naturelle'
                : 'Moroccan handmade straw craftsmanship'
            }
            className="absolute inset-0 w-full h-full object-cover"
            loading="eager"
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

        {/* Floating cart reservation card */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px]">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 space-y-5 animate-fade-in">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-primary-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
              </div>
              <div>
                <p className="font-serif font-bold text-[#1A1A1A] text-sm">
                  Rif Raw Straw
                </p>
                <p className="text-xs text-[#1A1A1A]/60">
                  {isFr
                    ? 'Artisanat Berbère Authentique'
                    : 'Authentic Berber Craftsmanship'}
                </p>
              </div>
            </div>

            {/* Reserved cart message */}
            <div>
              <h3 className="font-serif font-bold text-[#1A1A1A] text-lg">
                {isFr ? 'Votre panier est réservé' : 'Your cart is reserved'}
              </h3>
              <p className="text-sm text-[#1A1A1A]/60 mt-1">
                {isFr
                  ? 'Finalisez votre commande pour sécuriser vos articles.'
                  : 'Complete your order to secure your items.'}
              </p>
            </div>

            {/* Product preview */}
            <div className="flex items-center gap-3 bg-[#FAF9F6] rounded-xl p-3">
              <div className="w-14 h-14 rounded-lg bg-[#E6D3A3]/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                <svg
                  className="w-7 h-7 text-[#B8965A]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-[#1A1A1A] truncate">
                  {isFr ? 'Sac Bandoulière en Paille' : 'Straw Shoulder Bag'}
                </p>
                <p className="text-xs text-[#1A1A1A]/50">1x</p>
              </div>
              <p className="font-serif font-bold text-[#1A1A1A]">€ 39</p>
            </div>

            {/* Reassurance */}
            <div className="space-y-2.5 pt-1">
              {[
                isFr ? 'Paiement sécurisé' : 'Secure payment',
                isFr ? 'Livraison rapide' : 'Fast delivery',
                isFr ? 'Fait main au Maroc' : 'Handcrafted in Morocco',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm text-[#1A1A1A]/80">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom brand text */}
        <div className="absolute bottom-10 left-10 right-10">
          <p className="text-white/90 font-serif text-xl font-semibold">
            {isFr
              ? 'Artisanat authentique, livré chez vous.'
              : 'Authentic craft, delivered to you.'}
          </p>
          <p className="text-white/60 text-sm mt-2">
            {isFr
              ? 'Chaque pièce raconte une histoire.'
              : 'Every piece tells a story.'}
          </p>
        </div>
      </div>

      {/* ═══ RIGHT — Form ═══ */}
      <div className="flex-1 flex items-center justify-center px-5 py-10 lg:px-16">
        <div className="w-full max-w-[420px] animate-fade-in">
          {/* Back to home */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-10 transition-colors group"
            aria-label={isFr ? "Retour à l'accueil" : 'Back to home'}
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            {isFr ? 'Accueil' : 'Home'}
          </button>

          {/* Header */}
          <div className="mb-10">
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground tracking-wide">
              {isSignUp
                ? isFr
                  ? 'Créer un compte'
                  : 'Create account'
                : isFr
                  ? 'Bon retour'
                  : 'Welcome back'}
            </h1>
            <p className="text-muted-foreground mt-2 text-base">
              {isSignUp
                ? isFr
                  ? "Rejoignez-nous pour découvrir l'artisanat."
                  : 'Join us to discover the craft.'
                : isFr
                  ? 'Connectez-vous pour continuer.'
                  : 'Log in to continue your order.'}
            </p>
          </div>

          {/* Form */}
          <form
            data-testid="auth-form"
            onSubmit={isSignUp ? handleSignUp : handleSignIn}
            className="space-y-5"
          >
            <input type="hidden" name="csrf_token" value={csrfToken} />

            {/* Signup-only: name field (simple, no last name) */}
            {isSignUp && (
              <div className="space-y-1.5">
                <Label
                  htmlFor="auth-name"
                  className="text-foreground/80 text-sm font-medium"
                >
                  {t('auth:register.fullName')}
                </Label>
                <Input
                  id="auth-name"
                  data-testid="auth-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder={isFr ? 'Votre nom complet' : 'Your full name'}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  maxLength={100}
                  className="h-12 bg-card border-border/60 focus:border-primary focus:ring-primary/20 rounded-xl text-base placeholder:text-muted-foreground/50"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label
                htmlFor="auth-email"
                className="text-foreground/80 text-sm font-medium"
              >
                {t('auth:login.email')}
              </Label>
              <Input
                id="auth-email"
                data-testid="auth-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder={isFr ? 'votre@email.com' : 'your@email.com'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={255}
                className="h-12 bg-card border-border/60 focus:border-primary focus:ring-primary/20 rounded-xl text-base placeholder:text-muted-foreground/50"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="auth-password"
                className="text-foreground/80 text-sm font-medium"
              >
                {t('auth:login.password')}
              </Label>
              <div className="relative">
                <Input
                  id="auth-password"
                  data-testid="auth-password"
                  name={isSignUp ? 'new-password' : 'password'}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={isSignUp ? 8 : undefined}
                  className="h-12 bg-card border-border/60 focus:border-primary focus:ring-primary/20 rounded-xl text-base pr-11 placeholder:text-muted-foreground/50"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted rounded-lg"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            {/* Signup: confirm password + rules */}
            {isSignUp && (
              <>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="auth-confirm-password"
                    className="text-foreground/80 text-sm font-medium"
                  >
                    {t('auth:register.confirmPassword')}
                  </Label>
                  <div className="relative">
                    <Input
                      id="auth-confirm-password"
                      data-testid="auth-confirm-password"
                      name="confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="h-12 bg-card border-border/60 focus:border-primary focus:ring-primary/20 rounded-xl text-base pr-11 placeholder:text-muted-foreground/50"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted rounded-lg"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      aria-label={
                        showConfirmPassword ? 'Hide password' : 'Show password'
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground space-y-1 pl-1">
                  <p className={password.length >= 8 ? 'text-green-600' : ''}>
                    {password.length >= 8 ? '✓' : '○'}{' '}
                    {t(
                      'auth:register.passwordRules.minLength',
                      'Au moins 8 caractères'
                    )}
                  </p>
                  <p className={/[A-Z]/.test(password) ? 'text-green-600' : ''}>
                    {/[A-Z]/.test(password) ? '✓' : '○'}{' '}
                    {t(
                      'auth:register.passwordRules.uppercase',
                      'Une majuscule'
                    )}
                  </p>
                  <p className={/[0-9]/.test(password) ? 'text-green-600' : ''}>
                    {/[0-9]/.test(password) ? '✓' : '○'}{' '}
                    {t('auth:register.passwordRules.number', 'Un chiffre')}
                  </p>
                </div>
              </>
            )}

            {/* Forgot password (signin only) */}
            {!isSignUp && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setView('otp-reset')}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {t('auth:login.forgotPassword')}
                </button>
              </div>
            )}

            {/* CTA */}
            <Button
              type="submit"
              data-testid="auth-submit"
              disabled={isLoading}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-base font-medium tracking-wide shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.01]"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground" />
                  {isFr ? 'Chargement...' : 'Loading...'}
                </div>
              ) : isFr ? (
                'Continuer'
              ) : (
                'Continue'
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/60" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[hsl(var(--background))] px-4 text-muted-foreground tracking-wider">
                {isFr ? 'Ou continuer avec' : 'Or continue with'}
              </span>
            </div>
          </div>

          {/* Social logins */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-12 rounded-xl border-border/60 hover:border-primary/40 hover:bg-muted/50 transition-all duration-300 text-sm font-medium"
              onClick={() => {
                toast({
                  title: isFr ? 'Bientôt disponible' : 'Coming soon',
                  description: isFr
                    ? 'Google login sera bientôt disponible.'
                    : 'Google login coming soon.',
                });
              }}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-12 rounded-xl border-border/60 hover:border-primary/40 hover:bg-muted/50 transition-all duration-300 text-sm font-medium"
              onClick={() => {
                toast({
                  title: isFr ? 'Bientôt disponible' : 'Coming soon',
                  description: isFr
                    ? 'Apple login sera bientôt disponible.'
                    : 'Apple login coming soon.',
                });
              }}
            >
              <svg
                className="w-5 h-5 mr-2"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              Apple
            </Button>
          </div>

          {/* Toggle view */}
          <p className="text-center mt-8 text-sm text-muted-foreground">
            {isSignUp ? (
              <>
                {isFr ? 'Déjà un compte ?' : 'Already have an account?'}{' '}
                <button
                  type="button"
                  data-testid="auth-toggle-signin"
                  onClick={() => setView('signin')}
                  className="text-foreground font-semibold hover:text-primary transition-colors underline-offset-4 hover:underline"
                >
                  {isFr ? 'Se connecter' : 'Sign in'}
                </button>
              </>
            ) : (
              <>
                {isFr ? 'Pas encore de compte ?' : "Don't have an account?"}{' '}
                <button
                  type="button"
                  data-testid="auth-toggle-signup"
                  onClick={() => setView('signup')}
                  className="text-foreground font-semibold hover:text-primary transition-colors underline-offset-4 hover:underline inline-flex items-center gap-1"
                >
                  {isFr ? 'Créer un compte' : 'Sign up'}{' '}
                  <span aria-hidden="true">›</span>
                </button>
              </>
            )}
          </p>

          {/* Cart saved hint */}
          <p className="text-center mt-4 text-xs text-muted-foreground/70">
            {isFr
              ? 'Votre panier sera conservé après connexion.'
              : 'Your cart will be saved after login.'}
          </p>
        </div>
      </div>
    </div>
  );
}
