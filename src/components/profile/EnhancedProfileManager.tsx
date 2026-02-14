import React, { useState, useCallback, useMemo, useEffect } from 'react';
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

  // Memoize query functions to prevent infinite loops
  const profileQueryFn = useCallback(async () => {
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
  }, [user?.id, user?.user_metadata?.full_name]);

  const preferencesQueryFn = useCallback(async () => {
    if (!user) return [];
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id);
    
    if (error && error.code !== 'PGRST116') throw error;
    return data || [];
  }, [user?.id]);

  const loyaltyQueryFn = useCallback(async () => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('loyalty_points')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }, [user?.id]);

  // Fetch profile with enhanced caching
  const { data: profile, isLoading: profileLoading } = useOptimizedData(
    `profile_${user?.id}`,
    profileQueryFn,
    { 
      enableCache: true,
      cacheTime: 5 * 60 * 1000 // 5 minutes for profile data
    }
  );

  // Fetch user preferences with enhanced caching
  const { data: preferences, isLoading: preferencesLoading } = useOptimizedData(
    `preferences_${user?.id}`,
    preferencesQueryFn,
    { 
      enableCache: true,
      cacheTime: 10 * 60 * 1000 // 10 minutes for preferences
    }
  );

  // Fetch loyalty data with enhanced caching
  const { data: loyaltyData, isLoading: loyaltyLoading } = useOptimizedData(
    `loyalty_${user?.id}`,
    loyaltyQueryFn,
    { 
      enableCache: true,
      cacheTime: 10 * 60 * 1000 // 10 minutes for loyalty data
    }
  );

  // Calculate profile completion percentage using useMemo to prevent infinite loops
  const profileCompletion = useMemo(() => {
    if (!profile) return 0;
    
    const fields = ['full_name', 'bio', 'phone', 'location', 'city', 'country'];
    const filledFields = fields.filter(field => profile[field as keyof Profile]);
    return Math.round((filledFields.length / fields.length) * 100);
  }, [profile]);

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

  // Safety timeout: never block profile page for more than 3 seconds
  const [forceRender, setForceRender] = useState(false);
  useEffect(() => {
    if (authLoading || profileLoading) {
      const timeout = setTimeout(() => {
        console.warn('[EnhancedProfileManager] Loading timed out, rendering profile');
        setForceRender(true);
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [authLoading, profileLoading]);

  if ((authLoading || profileLoading) && !forceRender) {
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
            <Button 
              className="mt-4" 
              onClick={() => window.location.href = '/auth'}
              id="profile-login-redirect"
              name="profile-login-button"
            >
              Se connecter
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Overview content only; header and tabs are handled by the parent page */}
      <ProfileOverview
        user={user}
        profile={profile}
        onProfileUpdate={handleProfileUpdate}
      />
    </div>
  );
};