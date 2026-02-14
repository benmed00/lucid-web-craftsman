import React from 'react';
import { ProfileOverview } from './ProfileOverview';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export const EnhancedProfileManager: React.FC = () => {
  const { user, isLoading: authLoading, profile, refreshProfile } = useAuth();

  const handleProfileUpdate = async () => {
    await refreshProfile();
  };

  if (authLoading && !profile) {
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
      <ProfileOverview
        user={user}
        profile={profile}
        onProfileUpdate={handleProfileUpdate}
      />
    </div>
  );
};
