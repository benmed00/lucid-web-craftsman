import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation(['auth', 'common']);
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
  const { csrfToken } = useCsrfToken();

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
      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-40 right-20 w-48 h-48 bg-muted rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute bottom-20 left-20 w-40 h-40 bg-secondary/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
        </div>
        
        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md animate-fade-in">
            <div className="text-center mb-8 animate-scale-in">
              <div className="inline-flex items-center justify-center w-20 h-20 mb-4 bg-primary rounded-2xl shadow-lg">
                <svg className="w-10 h-10 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <h1 className="text-4xl font-serif font-bold text-foreground mb-2">Artisan du Rif</h1>
              <p className="text-muted-foreground text-lg">Artisanat authentique du Maroc</p>
              <div className="mt-2 w-16 h-1 bg-primary rounded-full mx-auto"></div>
            </div>
            
            <div className="bg-card/80 backdrop-blur-sm border border-border shadow-2xl rounded-2xl p-6">
              <OTPAuthFlow
                mode={otpFlow}
                onSuccess={handleOTPSuccess}
                onBack={() => setOtpFlow(null)}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-48 h-48 bg-muted rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-20 left-20 w-40 h-40 bg-secondary/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>
      
      {/* Pattern overlay */}
      <div className="absolute inset-0 opacity-[0.02] bg-repeat" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Ccircle cx='7' cy='7' r='1'/%3E%3Ccircle cx='53' cy='7' r='1'/%3E%3Ccircle cx='7' cy='53' r='1'/%3E%3Ccircle cx='53' cy='53' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }}></div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-fade-in">
          {/* Brand Header */}
          <div className="text-center mb-8 animate-scale-in">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-4 bg-primary rounded-2xl shadow-lg">
              <svg className="w-10 h-10 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <h1 className="text-4xl font-serif font-bold text-foreground mb-2">Artisan du Rif</h1>
            <p className="text-muted-foreground text-lg">Artisanat authentique du Maroc</p>
            <div className="mt-2 w-16 h-1 bg-primary rounded-full mx-auto"></div>
          </div>

          {/* Auth Method Selection */}
          <div className="mb-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div 
                className="grid grid-cols-2 gap-2 p-1.5 bg-card/60 backdrop-blur-sm border border-border rounded-xl shadow-sm"
                role="tablist"
                aria-label="Méthodes d'authentification"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={authMode === 'traditional'}
                  aria-controls="auth-panel"
                  onClick={() => setAuthMode('traditional')}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-300 ${
                    authMode === 'traditional'
                      ? 'bg-primary text-primary-foreground shadow-lg transform scale-[1.02]'
                      : 'text-muted-foreground hover:text-primary hover:bg-card/80'
                  }`}
                >
                  <Shield className="h-4 w-4" aria-hidden="true" />
                  <span className="text-sm">Classique</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={authMode === 'otp'}
                  aria-controls="auth-panel"
                  onClick={() => setAuthMode('otp')}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-300 ${
                    authMode === 'otp'
                      ? 'bg-primary text-primary-foreground shadow-lg transform scale-[1.02]'
                      : 'text-muted-foreground hover:text-primary hover:bg-card/80'
                  }`}
                >
                  <Smartphone className="h-4 w-4" aria-hidden="true" />
                  <span className="text-sm">Code sécurisé</span>
                </button>
              </div>
          </div>

          {authMode === 'otp' ? (
            <Card className="bg-card/80 backdrop-blur-sm border border-border shadow-2xl animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <CardHeader className="text-center pb-6 bg-muted/50 rounded-t-lg">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Smartphone className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl font-serif text-foreground">Authentification sécurisée</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Connectez-vous ou créez un compte avec un code de sécurité
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <Button 
                  onClick={() => setOtpFlow('signin')} 
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] py-6"
                  variant="default"
                >
                  <Mail className="h-5 w-5 mr-3" />
                  <span className="font-medium">Se connecter par code</span>
                </Button>
                <Button 
                  onClick={() => setOtpFlow('signup')} 
                  className="w-full border-2 border-border text-foreground hover:bg-muted hover:border-primary/50 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02] py-6"
                  variant="outline"
                >
                  <Shield className="h-5 w-5 mr-3" />
                  <span className="font-medium">S'inscrire par code</span>
                </Button>
                <Button 
                  onClick={() => setOtpFlow('reset')} 
                  className="w-full text-muted-foreground hover:text-primary py-3"
                  variant="ghost"
                  size="sm"
                >
                  Mot de passe oublié ?
                </Button>
              </CardContent>
            </Card>
          ) : (
          <Card className="bg-card/80 backdrop-blur-sm border border-border shadow-2xl animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <CardHeader className="text-center pb-6 bg-muted/50 rounded-t-lg">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl font-serif text-foreground">Bienvenue</CardTitle>
              <CardDescription className="text-muted-foreground">
                Connectez-vous ou créez un compte pour découvrir nos créations artisanales
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <Tabs defaultValue="signin" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8 bg-muted p-1.5 rounded-xl">
                  <TabsTrigger 
                    value="signin" 
                    className="data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary font-medium py-3 rounded-lg transition-all duration-300"
                  >
                    Se connecter
                  </TabsTrigger>
                  <TabsTrigger 
                    value="signup" 
                    className="data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary font-medium py-3 rounded-lg transition-all duration-300"
                  >
                    S'inscrire
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="signin" className="animate-fade-in">
                  <form onSubmit={handleSignIn} className="space-y-5">
                    <input type="hidden" name="csrf_token" value={csrfToken} />
                    <div className="space-y-2">
                      <Label htmlFor="signin-email" className="text-foreground font-medium">Email</Label>
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="votre@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        maxLength={255}
                        className="border-border focus:border-primary focus:ring-primary/20 bg-card/80 py-6 text-lg"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password" className="text-foreground font-medium">Mot de passe</Label>
                      <div className="relative">
                        <Input
                          id="signin-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="border-border focus:border-primary focus:ring-primary/20 bg-card/80 py-6 text-lg pr-12"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] py-6 text-lg font-medium"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground mr-2"></div>
                          Connexion...
                        </>
                      ) : (
                        "Se connecter"
                      )}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="animate-fade-in">
                  <form onSubmit={handleSignUp} className="space-y-5">
                    <input type="hidden" name="csrf_token" value={csrfToken} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-name" className="text-foreground font-medium">Nom complet</Label>
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="Jean Dupont"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required
                          maxLength={100}
                          className="border-border focus:border-primary focus:ring-primary/20 bg-card/80 py-6"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-phone" className="text-foreground font-medium">Téléphone <span className="text-muted-foreground text-sm">(optionnel)</span></Label>
                        <Input
                          id="signup-phone"
                          type="tel"
                          placeholder="+33 6 12 34 56 78"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          maxLength={20}
                          className="border-border focus:border-primary focus:ring-primary/20 bg-card/80 py-6"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-foreground font-medium">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="votre@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        maxLength={255}
                        className="border-border focus:border-primary focus:ring-primary/20 bg-card/80 py-6"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-foreground font-medium">Mot de passe</Label>
                      <div className="relative">
                        <Input
                          id="signup-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="border-border focus:border-primary focus:ring-primary/20 bg-card/80 py-6 pr-12"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password" className="text-foreground font-medium">Confirmer le mot de passe</Label>
                      <div className="relative">
                        <Input
                          id="confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          className="border-border focus:border-primary focus:ring-primary/20 bg-card/80 py-6 pr-12"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] py-6 text-lg font-medium"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground mr-2"></div>
                          Création du compte...
                        </>
                      ) : (
                        "Créer un compte"
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          )}

          {/* Additional OTP Options for Traditional Mode */}
          {authMode === 'traditional' && (
            <div className="text-center mt-6 animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOtpFlow('reset')}
                className="text-muted-foreground hover:text-primary hover:bg-card/60 px-6 py-3 rounded-lg transition-all duration-300"
              >
                <Mail className="h-4 w-4 mr-2" />
                Mot de passe oublié ? Utiliser un code sécurisé
              </Button>
            </div>
          )}

          {/* Back to Home */}
          <div className="text-center mt-8 animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="text-muted-foreground hover:text-primary hover:bg-card/60 px-6 py-3 rounded-lg transition-all duration-300 group"
            >
              <svg className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Retour à l'accueil
            </Button>
          </div>

          {/* Footer */}
          <div className="text-center mt-8 text-muted-foreground text-sm animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <p>© 2024 Artisan du Rif - Artisanat authentique</p>
          </div>
        </div>
      </div>
    </div>
  );
}