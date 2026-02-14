import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import type { Profile } from '@/context/AuthContext';
import { EnhancedProfileManager } from '@/components/profile/EnhancedProfileManager';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import Footer from '@/components/Footer';

const VALID_TABS = ['overview', 'personal', 'loyalty', 'preferences', 'orders'] as const;
type ProfileTab = typeof VALID_TABS[number];

export default function EnhancedProfile() {
  const { t } = useTranslation('pages');
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut, isLoading: authLoading, profile, refreshProfile } = useOptimizedAuth();
  const isProfileLoading = authLoading && !profile;

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
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [authLoading, isProfileLoading]);

  // Don't auto-redirect — show a friendly "login required" message instead

  const handleProfileUpdate = async (_updatedProfile?: any) => {
    // Refresh profile from AuthContext (single source of truth)
    await refreshProfile();
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (error) throw error;

      await signOut();
      navigate('/auth');
      toast.success(t('profile.messages.deleteSuccess'));
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast.error(t('profile.messages.deleteError'));
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
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
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16 max-w-md text-center">
          <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <UserIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-3">
              {t('profile.loginRequired', 'Connexion requise')}
            </h2>
            <p className="text-muted-foreground mb-6">
              {t('profile.loginRequiredDescription', 'Veuillez vous connecter pour accéder à votre profil et gérer vos informations.')}
            </p>
            <Button onClick={() => navigate('/auth')} className="w-full">
              {t('profile.buttons.login', 'Se connecter')}
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
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