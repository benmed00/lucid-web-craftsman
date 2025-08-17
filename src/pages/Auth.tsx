import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useCsrfToken } from '@/hooks/useCsrfToken';
import { Eye, EyeOff, Shield, Smartphone, Mail } from 'lucide-react';
import { validateAndSanitizeEmail, validateAndSanitizeName, validatePassword } from '@/utils/xssProtection';
import { createRateLimiter } from '@/utils/validation';
import { OTPAuthFlow } from '@/components/auth/OTPAuthFlow';

// Rate limiters for different actions
const authRateLimiter = createRateLimiter(5, 15 * 60 * 1000); // 5 attempts per 15 minutes

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'traditional' | 'otp'>('traditional');
  const [otpFlow, setOtpFlow] = useState<'signin' | 'signup' | 'reset' | null>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, signUp, user, isLoading: authLoading } = useOptimizedAuth();
  const csrfToken = useCsrfToken();

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Rate limiting check
    const clientId = navigator.userAgent + window.location.hostname;
    if (!authRateLimiter(clientId)) {
      toast({
        title: "Trop de tentatives",
        description: "Veuillez attendre 15 minutes avant de réessayer",
        variant: "destructive"
      });
      return;
    }

    // Validation and sanitization
    try {
      const sanitizedEmail = validateAndSanitizeEmail(email);
      
      if (!password) {
        throw new Error("Mot de passe requis");
      }

      setIsLoading(true);
      await signIn(sanitizedEmail, password);
      toast({
        title: "Connexion réussie",
        description: "Bienvenue !"
      });
    } catch (error: any) {
      toast({
        title: "Erreur de connexion",
        description: error.message || "Email ou mot de passe incorrect",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Rate limiting check
    const clientId = navigator.userAgent + window.location.hostname;
    if (!authRateLimiter(clientId)) {
      toast({
        title: "Trop de tentatives",
        description: "Veuillez attendre 15 minutes avant de réessayer",
        variant: "destructive"
      });
      return;
    }

    // Validation and sanitization
    try {
      const sanitizedEmail = validateAndSanitizeEmail(email);
      const sanitizedFullName = validateAndSanitizeName(fullName);
      
      validatePassword(password);

      if (password !== confirmPassword) {
        throw new Error("Les mots de passe ne correspondent pas");
      }

      setIsLoading(true);
      await signUp(sanitizedEmail, password, sanitizedFullName, phone || undefined);
      toast({
        title: "Inscription réussie",
        description: "Bienvenue ! Votre compte a été créé avec succès."
      });
    } catch (error: any) {
      toast({
        title: "Erreur d'inscription",
        description: error.message || "Une erreur s'est produite lors de l'inscription",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPSuccess = () => {
    setOtpFlow(null);
    navigate('/');
  };

  // Show OTP flow if selected
  if (otpFlow) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Artisan du Rif</h1>
            <p className="text-muted-foreground">Artisanat authentique du Maroc</p>
          </div>
          
          <OTPAuthFlow
            mode={otpFlow}
            onSuccess={handleOTPSuccess}
            onBack={() => setOtpFlow(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Artisan du Rif</h1>
          <p className="text-muted-foreground">Artisanat authentique du Maroc</p>
        </div>

        {/* Auth Method Selection */}
        <div className="mb-6">
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
            <Button
              variant={authMode === 'traditional' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setAuthMode('traditional')}
              className="flex items-center gap-2"
            >
              <Shield className="h-4 w-4" />
              Classique
            </Button>
            <Button
              variant={authMode === 'otp' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setAuthMode('otp')}
              className="flex items-center gap-2"
            >
              <Smartphone className="h-4 w-4" />
              Code sécurisé
            </Button>
          </div>
        </div>

        {authMode === 'otp' ? (
          <Card className="border border-border/50 shadow-lg">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl">Authentification sécurisée</CardTitle>
              <CardDescription>
                Connectez-vous ou créez un compte avec un code de sécurité
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={() => setOtpFlow('signin')} 
                className="w-full"
                variant="default"
              >
                <Mail className="h-4 w-4 mr-2" />
                Se connecter par code
              </Button>
              <Button 
                onClick={() => setOtpFlow('signup')} 
                className="w-full"
                variant="outline"
              >
                <Shield className="h-4 w-4 mr-2" />
                S'inscrire par code
              </Button>
              <Button 
                onClick={() => setOtpFlow('reset')} 
                className="w-full"
                variant="ghost"
                size="sm"
              >
                Mot de passe oublié ?
              </Button>
            </CardContent>
          </Card>
        ) : (
        <Card className="border border-border/50 shadow-lg">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl">Bienvenue</CardTitle>
            <CardDescription>
              Connectez-vous ou créez un compte pour découvrir nos créations artisanales
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin">Se connecter</TabsTrigger>
                <TabsTrigger value="signup">S'inscrire</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <input type="hidden" name="csrf_token" value={csrfToken} />
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="votre@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      maxLength={255}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Mot de passe</Label>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Connexion..." : "Se connecter"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <input type="hidden" name="csrf_token" value={csrfToken} />
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nom complet</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Jean Dupont"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      maxLength={100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">Téléphone (optionnel)</Label>
                    <Input
                      id="signup-phone"
                      type="tel"
                      placeholder="+33 6 12 34 56 78"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      maxLength={20}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="votre@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      maxLength={255}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Mot de passe</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Création du compte..." : "Créer un compte"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        )}

        {/* Additional OTP Options for Traditional Mode */}
        {authMode === 'traditional' && (
          <div className="text-center mt-4 space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOtpFlow('reset')}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Mot de passe oublié ? Utiliser un code sécurisé
            </Button>
          </div>
        )}

        <div className="text-center mt-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="text-muted-foreground hover:text-foreground"
          >
            ← Retour à l'accueil
          </Button>
        </div>
      </div>
    </div>
  );
}