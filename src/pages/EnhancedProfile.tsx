import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import Footer from '@/components/Footer';

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

const VALID_TABS = ['overview', 'personal', 'loyalty', 'preferences', 'orders'] as const;
type ProfileTab = typeof VALID_TABS[number];

export default function EnhancedProfile() {
  const { t } = useTranslation('pages');
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut, isLoading: authLoading, session } = useOptimizedAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  // Derive active tab from URL hash
  const getTabFromHash = (): ProfileTab => {
    const hash = location.hash.replace('#', '') as ProfileTab;
    return VALID_TABS.includes(hash) ? hash : 'overview';
  };
  const [activeTab, setActiveTab] = useState<ProfileTab>(getTabFromHash);

  // Sync tab with URL hash
  useEffect(() => {
    setActiveTab(getTabFromHash());
  }, [location.hash]);

  const handleTabChange = (tab: string) => {
    const validTab = tab as ProfileTab;
    setActiveTab(validTab);
    navigate(`/profile#${validTab}`, { replace: true });
  };

  // Safety timeout: force render after 5s to prevent infinite skeleton
  const [forceRender, setForceRender] = useState(false);
  useEffect(() => {
    if (authLoading || isProfileLoading) {
      const timeout = setTimeout(() => {
        console.warn('[EnhancedProfile] Loading timed out after 5s, force rendering');
        setForceRender(true);
        setIsProfileLoading(false);
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [authLoading, isProfileLoading]);

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
      toast.error(t('profile.messages.loadError'));
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
      toast.error(t('profile.messages.createError'));
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
      toast.success(t('profile.messages.deleteSuccess'));
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast.error(t('profile.messages.deleteError'));
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
      toast.error(t('profile.messages.signOutError'));
    }
  };

  if ((authLoading || isProfileLoading) && !forceRender) {
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
              <h1 className="text-3xl font-bold mb-2">{t('profile.title')}</h1>
              <p className="text-muted-foreground">
                {t('profile.subtitle')}
              </p>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={() => navigate('/')}>
                <Home className="h-4 w-4 mr-2" />
                {t('profile.buttons.home')}
              </Button>
              
              <Button variant="outline" onClick={handleSignOut}>
                <UserCog className="h-4 w-4 mr-2" />
                {t('profile.buttons.signOut')}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('profile.buttons.deleteAccount')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('profile.deleteDialog.title')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('profile.deleteDialog.description')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('profile.deleteDialog.cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {t('profile.deleteDialog.confirm')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          
          <Separator className="mt-6" />
        </div>

        {/* Profile Content */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <UserIcon className="h-4 w-4" />
              <span className="hidden sm:inline">{t('profile.tabs.overview')}</span>
              <span className="sm:hidden">{t('profile.tabs.overviewShort')}</span>
            </TabsTrigger>
            <TabsTrigger value="personal" className="flex items-center gap-2">
              <UserCog className="h-4 w-4" />
              <span className="hidden sm:inline">{t('profile.tabs.personal')}</span>
              <span className="sm:hidden">{t('profile.tabs.personalShort')}</span>
            </TabsTrigger>
            <TabsTrigger value="loyalty" className="flex items-center gap-2">
              <Crown className="h-4 w-4" />
              <span className="hidden sm:inline">{t('profile.tabs.loyalty')}</span>
              <span className="sm:hidden">{t('profile.tabs.loyaltyShort')}</span>
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">{t('profile.tabs.preferences')}</span>
              <span className="sm:hidden">{t('profile.tabs.preferencesShort')}</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">{t('profile.tabs.orders')}</span>
              <span className="sm:hidden">{t('profile.tabs.ordersShort')}</span>
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

      <Footer />
    </div>
  );
}