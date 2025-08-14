import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Lock, Mail, Leaf, Info } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useCsrfToken } from '@/hooks/useCsrfToken';
import { emailSchema, passwordSchema, sanitizeInput, loginRateLimiter } from '@/utils/validation';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn, user } = useAuth();
  const { isAuthenticated: isAdminAuthenticated, isLoading: adminLoading } = useAdminAuth();
  const csrfToken = useCsrfToken();

  // Redirect if already authenticated as admin
  useEffect(() => {
    if (!adminLoading && isAdminAuthenticated) {
      navigate('/admin', { replace: true });
    }
  }, [isAdminAuthenticated, adminLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Rate limiting check
    const clientId = navigator.userAgent + window.location.hostname;
    if (!loginRateLimiter(clientId)) {
      toast.error('Trop de tentatives. Veuillez attendre 15 minutes avant de réessayer.');
      return;
    }

    // Input validation and sanitization
    const sanitizedEmail = sanitizeInput(email);
    const sanitizedPassword = sanitizeInput(password);
    
    try {
      emailSchema.parse(sanitizedEmail);
      passwordSchema.parse(sanitizedPassword);
    } catch (error) {
      toast.error('Veuillez vérifier vos informations de connexion');
      return;
    }
    
    setIsLoading(true);
    
    try {
      await signIn(sanitizedEmail, sanitizedPassword);
      // Success - let useEffect handle the admin check and redirect
    } catch (error) {
      setIsLoading(false);
      
      if (error instanceof Error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Email ou mot de passe incorrect');
        } else if (error.message.includes('Email not confirmed')) {
          toast.error('Veuillez confirmer votre email avant de vous connecter');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error('Erreur de connexion');
      }
    }
  };

  // Handle admin check after successful login
  useEffect(() => {
    if (user && !adminLoading && isLoading) {
      setIsLoading(false);
      
      if (isAdminAuthenticated) {
        toast.success('Connexion administrateur réussie!');
        navigate('/admin', { replace: true });
      } else {
        toast.error('Accès refusé. Ce compte n\'a pas les privilèges administrateur.');
      }
    }
  }, [user, adminLoading, isAdminAuthenticated, navigate, isLoading]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-beige-50 to-olive-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-olive-100">
              <Leaf className="h-8 w-8 text-olive-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-serif text-stone-800">Administration</CardTitle>
          <CardDescription className="text-center">
            Connectez-vous pour accéder au panel d'administration
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">

          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="hidden" name="csrf_token" value={csrfToken} />
            <div className="space-y-2">
              <Label htmlFor="email">Email administrateur</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@artisanrif.com"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-stone-400 hover:text-stone-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-olive-700 hover:bg-olive-800"
              disabled={isLoading || adminLoading}
            >
              {isLoading || adminLoading ? "Connexion en cours..." : "Se connecter"}
            </Button>
          </form>

          <div className="text-center pt-4">
            <Link 
              to="/" 
              className="text-sm text-stone-600 hover:text-olive-700 transition-colors"
            >
              ← Retour au site principal
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;