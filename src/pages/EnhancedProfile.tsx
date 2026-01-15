import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '@supabase/supabase-js';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { User as UserIcon, Settings, Package, UserCog, Home, Trash2, Shield, Crown } from 'lucide-react';
import { ProfileOverview } from '@/components/profile/ProfileOverview';
import { PersonalInfo } from '@/components/profile/PersonalInfo';
import { PreferencesSettings } from '@/components/profile/PreferencesSettings';
import { OrderHistory } from '@/components/profile/OrderHistory';
import { LoyaltyProgram } from '@/components/profile/LoyaltyProgram';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { EnhancedProfileManager } from '@/components/profile/EnhancedProfileManager';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Profile {
  id: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  phone: string | null;
  location: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  website_url: string | null;
  instagram_handle: string | null;
  facebook_url: string | null;
  twitter_handle: string | null;
  created_at: string;
  updated_at: string;
}

export default function EnhancedProfile() {
  const navigate = useNavigate();
  const { user, signOut, isLoading: authLoading, session } = useOptimizedAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Track if profile has been loaded to prevent duplicate requests
  const hasLoadedProfile = useRef(false);
  
  useEffect(() => {
    // Don't redirect while auth is still loading
    if (authLoading) return;
    
    if (!user) {
      navigate('/auth');
      return;
    }

    // Only load profile once per session
    if (!hasLoadedProfile.current) {
      hasLoadedProfile.current = true;
      loadProfile();
    }
  }, [user, authLoading]); // Removed navigate from deps to prevent re-runs

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No profile found, create one
          await createProfile();
        } else {
          throw error;
        }
      } else {
        setProfile(data);
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
      toast.error('Erreur lors du chargement du profil');
    } finally {
      setIsProfileLoading(false);
    }
  };

  const createProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert([{
          id: user.id,
          full_name: user.user_metadata?.full_name || null,
          bio: null,
          avatar_url: null
        }])
        .select()
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      console.error('Error creating profile:', error);
      toast.error('Erreur lors de la création du profil');
    }
  };

  const handleProfileUpdate = (updatedProfile: Profile) => {
    setProfile(updatedProfile);
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    setIsProfileLoading(true);
    try {
      // Delete profile data
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (error) throw error;

      // Sign out user
      await signOut();
      navigate('/auth');
      toast.success('Compte supprimé avec succès');
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast.error('Erreur lors de la suppression du compte');
    } finally {
      setIsProfileLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      // Clean up auth state properly
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });
      
      await signOut();
      // Force page reload for clean state
      window.location.href = '/auth';
    } catch (error: any) {
      console.error('Error signing out:', error);
      toast.error('Erreur lors de la déconnexion');
    }
  };

  if (authLoading || isProfileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Mon Profil</h1>
              <p className="text-muted-foreground">
                Gérez vos informations personnelles, préférences et historique
              </p>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={() => navigate('/')}>
                <Home className="h-4 w-4 mr-2" />
                Accueil
              </Button>
              
              <Button variant="outline" onClick={handleSignOut}>
                <UserCog className="h-4 w-4 mr-2" />
                Se déconnecter
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer le compte
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer le compte</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action est irréversible. Toutes vos données seront définitivement supprimées.
                      Êtes-vous sûr de vouloir supprimer votre compte ?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Supprimer définitivement
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          
          <Separator className="mt-6" />
        </div>

        {/* Profile Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <UserIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Vue d'ensemble</span>
              <span className="sm:hidden">Profil</span>
            </TabsTrigger>
            <TabsTrigger value="personal" className="flex items-center gap-2">
              <UserCog className="h-4 w-4" />
              <span className="hidden sm:inline">Informations</span>
              <span className="sm:hidden">Infos</span>
            </TabsTrigger>
            <TabsTrigger value="loyalty" className="flex items-center gap-2">
              <Crown className="h-4 w-4" />
              <span className="hidden sm:inline">Fidélité</span>
              <span className="sm:hidden">Points</span>
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Préférences</span>
              <span className="sm:hidden">Prefs</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Commandes</span>
              <span className="sm:hidden">Orders</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-4">
            <EnhancedProfileManager />
          </TabsContent>

          <TabsContent value="personal" className="mt-4">
            <PersonalInfo 
              user={user} 
              profile={profile} 
              onProfileUpdate={handleProfileUpdate}
            />
          </TabsContent>

          <TabsContent value="loyalty" className="mt-4">
            <LoyaltyProgram user={user} />
          </TabsContent>

          <TabsContent value="preferences" className="mt-4">
            <PreferencesSettings user={user} />
          </TabsContent>

          <TabsContent value="orders" className="mt-4">
            <OrderHistory user={user} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <footer className="border-t bg-muted/20 mt-12">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Contact Info */}
            <div>
              <h3 className="font-semibold mb-4">Contact</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Email: contact@rifstraw.com</p>
                <p>Téléphone: +33 1 23 45 67 89</p>
                <p>Adresse: 6 allée de la Sèvre, 44400 Rezé</p>
              </div>
            </div>

            {/* Important Links */}
            <div>
              <h3 className="font-semibold mb-4">Liens Importants</h3>
              <div className="space-y-2 text-sm">
                <Button 
                  variant="link" 
                  className="h-auto p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => navigate('/terms')}
                >
                  Conditions d'utilisation
                </Button>
                <Button 
                  variant="link" 
                  className="h-auto p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => navigate('/cgv')}
                >
                  Conditions générales de vente
                </Button>
                <Button 
                  variant="link" 
                  className="h-auto p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => window.open('/privacy-policy', '_blank')}
                >
                  Politique de confidentialité (RGPD)
                </Button>
              </div>
            </div>

            {/* Legal */}
            <div>
              <h3 className="font-semibold mb-4">Informations Légales</h3>
              <div className="space-y-2 text-sm">
                <Button 
                  variant="link" 
                  className="h-auto p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => window.open('/legal-notices', '_blank')}
                >
                  Mentions légales
                </Button>
                <Button 
                  variant="link" 
                  className="h-auto p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => window.open('/cookie-policy', '_blank')}
                >
                  Politique des cookies
                </Button>
                <p className="text-xs text-muted-foreground mt-4">
                  © 2024 RifStraw. Tous droits réservés.
                </p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}