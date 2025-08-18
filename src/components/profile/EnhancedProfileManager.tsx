import React, { useState, useCallback, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  User as UserIcon, 
  Settings, 
  Bell, 
  Shield, 
  CreditCard, 
  MapPin,
  Smartphone,
  Mail,
  Globe,
  History,
  Award,
  Heart,
} from 'lucide-react';
import { ProfileOverview } from './ProfileOverview';
import { PersonalInfo } from './PersonalInfo';
import { PreferencesSettings } from './PreferencesSettings';
import { OrderHistory } from './OrderHistory';
import { LoyaltyProgram } from './LoyaltyProgram';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useOptimizedData } from '@/hooks/useOptimizedData';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
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
  preferences: any;
  notification_settings: any;
  created_at: string;
  updated_at: string;
}

interface UserPreferences {
  id: string;
  email_notifications: boolean;
  marketing_emails: boolean;
  order_updates: boolean;
  privacy_profile_public: boolean;
  privacy_show_email: boolean;
  privacy_show_phone: boolean;
  language: string;
  currency: string;
}

export const EnhancedProfileManager: React.FC = () => {
  const { user, isLoading: authLoading } = useOptimizedAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [profileCompletion, setProfileCompletion] = useState(0);

  // Fetch profile with enhanced caching
  const { data: profile, isLoading: profileLoading } = useOptimizedData(
    `profile_${user?.id}`,
    async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        // Create profile if it doesn't exist
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([{ id: user.id, full_name: user.user_metadata?.full_name }])
          .select()
          .single();
        
        if (createError) throw createError;
        return newProfile;
      }
      return data;
    },
    { 
      enableCache: true,
      cacheTime: 5 * 60 * 1000 // 5 minutes for profile data
    }
  );

  // Fetch user preferences with enhanced caching
  const { data: preferences, isLoading: preferencesLoading } = useOptimizedData(
    `preferences_${user?.id}`,
    async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id);
      
      if (error && error.code !== 'PGRST116') throw error;
      return data || [];
    },
    { 
      enableCache: true,
      cacheTime: 10 * 60 * 1000 // 10 minutes for preferences
    }
  );

  // Fetch loyalty data with enhanced caching
  const { data: loyaltyData, isLoading: loyaltyLoading } = useOptimizedData(
    `loyalty_${user?.id}`,
    async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('loyalty_points')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    { 
      enableCache: true,
      cacheTime: 10 * 60 * 1000 // 10 minutes for loyalty data
    }
  );

  // Fetch profile completion percentage using database function
  React.useEffect(() => {
    const getProfileCompletion = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase.rpc('get_profile_completion_percentage', {
          user_uuid: user.id
        });
        
        if (error) throw error;
        setProfileCompletion(data || 0);
      } catch (error) {
        console.error('Error getting profile completion:', error);
        // Fallback calculation
        if (profile) {
          const fields = ['full_name', 'bio', 'phone', 'location', 'city', 'country'];
          const filledFields = fields.filter(field => profile[field as keyof Profile]);
          setProfileCompletion(Math.round((filledFields.length / fields.length) * 100));
        }
      }
    };
    
    getProfileCompletion();
  }, [user?.id, profile]);

  const handleProfileUpdate = useCallback(async (updatedProfile: Profile) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updatedProfile)
        .eq('id', user?.id);
      
      if (error) throw error;
      toast.success('Profil mis à jour avec succès');
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  }, [user?.id]);

  const getCompletionBadgeColor = (percentage: number) => {
    if (percentage >= 80) return 'default';
    if (percentage >= 50) return 'secondary'; 
    return 'outline';
  };

  if (authLoading || profileLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
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
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <Card>
          <CardContent className="pt-6">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Accès restreint</h2>
            <p className="text-muted-foreground">
              Veuillez vous connecter pour accéder à votre profil.
            </p>
            <Button className="mt-4" onClick={() => window.location.href = '/auth'}>
              Se connecter
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Profile Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">Mon Profil</h1>
            <p className="text-muted-foreground">
              Gérez vos informations personnelles et préférences
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant={getCompletionBadgeColor(profileCompletion)}>
              Profil {profileCompletion}% complété
            </Badge>
            {user.email_confirmed_at && (
              <Badge variant="default" className="bg-green-100 text-green-800">
                <Shield className="h-3 w-3 mr-1" />
                Vérifié
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Profile Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <UserIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Vue d'ensemble</span>
          </TabsTrigger>
          <TabsTrigger value="personal" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Informations</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Préférences</span>
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Commandes</span>
          </TabsTrigger>
          <TabsTrigger value="loyalty" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            <span className="hidden sm:inline">Fidélité</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Sécurité</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {authLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ) : (
            <ProfileOverview
              user={user}
              profile={profile}
              onProfileUpdate={handleProfileUpdate}
            />
          )}
        </TabsContent>

        <TabsContent value="personal">
          {authLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ) : (
            <PersonalInfo
              user={user}
              profile={profile}
              onProfileUpdate={handleProfileUpdate}
            />
          )}
        </TabsContent>

        <TabsContent value="preferences">
          {preferencesLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ) : (
            <PreferencesSettings
              user={user}
            />
          )}
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Historique des commandes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Aucune commande trouvée. Commencez vos achats pour voir votre historique ici.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loyalty">
          {loyaltyLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ) : (
            <LoyaltyProgram 
              user={user}
            />
          )}
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Sécurité et confidentialité
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Mail className="h-8 w-8 text-blue-500" />
                      <div>
                        <h3 className="font-semibold">Email vérifié</h3>
                        <p className="text-sm text-muted-foreground">
                          {user.email_confirmed_at ? 'Vérifié le ' + 
                            new Date(user.email_confirmed_at).toLocaleDateString() : 'Non vérifié'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-8 w-8 text-green-500" />
                      <div>
                        <h3 className="font-semibold">Téléphone</h3>
                        <p className="text-sm text-muted-foreground">
                          {user.phone ? 'Configuré' : 'Non configuré'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Button variant="outline" className="w-full">
                  Changer le mot de passe
                </Button>
                <Button variant="outline" className="w-full">
                  Configurer l'authentification à deux facteurs
                </Button>
                <Button variant="destructive" className="w-full">
                  Supprimer mon compte
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};