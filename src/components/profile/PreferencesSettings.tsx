import { useState, useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Bell, Globe, Shield, Palette } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UserPreferences {
  id: string;
  user_id: string;
  email_notifications: boolean;
  marketing_emails: boolean;
  order_updates: boolean;
  language: string;
  currency: string;
  privacy_profile_public: boolean;
  privacy_show_email: boolean;
  privacy_show_phone: boolean;
  created_at: string;
  updated_at: string;
}

interface PreferencesSettingsProps {
  user: User;
}

export function PreferencesSettings({ user }: PreferencesSettingsProps) {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(
    document.documentElement.classList.contains('dark')
  );

  // Load user preferences once on mount
  const hasLoadedRef = useRef(false);
  
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    loadPreferences();
  }, []); // Empty deps - only run once

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No preferences found, create default ones
          await createDefaultPreferences();
        } else {
          throw error;
        }
      } else {
        setPreferences(data);
      }
    } catch (error: any) {
      console.error('Error loading preferences:', error);
      toast.error('Erreur lors du chargement des préférences');
    }
  };

  const createDefaultPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .insert([{
          user_id: user.id,
          email_notifications: true,
          marketing_emails: false,
          order_updates: true,
          language: 'fr',
          currency: 'EUR',
          privacy_profile_public: false,
          privacy_show_email: false,
          privacy_show_phone: false
        }])
        .select()
        .single();

      if (error) throw error;
      setPreferences(data);
    } catch (error: any) {
      console.error('Error creating default preferences:', error);
      toast.error('Erreur lors de la création des préférences par défaut');
    }
  };

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    if (!preferences) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .update(updates)
        .eq('id', preferences.id)
        .select()
        .single();

      if (error) throw error;

      setPreferences(data);
      toast.success('Préférences mises à jour');
    } catch (error: any) {
      console.error('Error updating preferences:', error);
      toast.error('Erreur lors de la mise à jour des préférences');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  if (!preferences) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="email_notifications" className="font-medium">
                Notifications par email
              </Label>
              <p className="text-sm text-muted-foreground">
                Recevoir des notifications importantes par email
              </p>
            </div>
            <Switch
              id="email_notifications"
              checked={preferences.email_notifications}
              onCheckedChange={(checked) => 
                updatePreferences({ email_notifications: checked })
              }
              disabled={isLoading}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="order_updates" className="font-medium">
                Mises à jour de commandes
              </Label>
              <p className="text-sm text-muted-foreground">
                Notifications sur le statut de vos commandes
              </p>
            </div>
            <Switch
              id="order_updates"
              checked={preferences.order_updates}
              onCheckedChange={(checked) => 
                updatePreferences({ order_updates: checked })
              }
              disabled={isLoading}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="marketing_emails" className="font-medium">
                Emails marketing
              </Label>
              <p className="text-sm text-muted-foreground">
                Recevoir des offres spéciales et nouveautés
              </p>
            </div>
            <Switch
              id="marketing_emails"
              checked={preferences.marketing_emails}
              onCheckedChange={(checked) => 
                updatePreferences({ marketing_emails: checked })
              }
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Language and Region */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Langue et région
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="language">Langue</Label>
              <Select
                value={preferences.language}
                onValueChange={(value) => updatePreferences({ language: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une langue" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="currency">Devise</Label>
              <Select
                value={preferences.currency}
                onValueChange={(value) => updatePreferences({ currency: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une devise" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="CAD">CAD ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Confidentialité
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="privacy_profile_public" className="font-medium">
                Profil public
              </Label>
              <p className="text-sm text-muted-foreground">
                Rendre votre profil visible aux autres utilisateurs
              </p>
            </div>
            <Switch
              id="privacy_profile_public"
              checked={preferences.privacy_profile_public}
              onCheckedChange={(checked) => 
                updatePreferences({ privacy_profile_public: checked })
              }
              disabled={isLoading}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="privacy_show_email" className="font-medium">
                Afficher l'email
              </Label>
              <p className="text-sm text-muted-foreground">
                Afficher votre adresse email sur votre profil public
              </p>
            </div>
            <Switch
              id="privacy_show_email"
              checked={preferences.privacy_show_email}
              onCheckedChange={(checked) => 
                updatePreferences({ privacy_show_email: checked })
              }
              disabled={isLoading || !preferences.privacy_profile_public}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="privacy_show_phone" className="font-medium">
                Afficher le téléphone
              </Label>
              <p className="text-sm text-muted-foreground">
                Afficher votre numéro de téléphone sur votre profil public
              </p>
            </div>
            <Switch
              id="privacy_show_phone"
              checked={preferences.privacy_show_phone}
              onCheckedChange={(checked) => 
                updatePreferences({ privacy_show_phone: checked })
              }
              disabled={isLoading || !preferences.privacy_profile_public}
            />
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Apparence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="dark_mode" className="font-medium">
                Mode sombre
              </Label>
              <p className="text-sm text-muted-foreground">
                Basculer entre le thème clair et sombre
              </p>
            </div>
            <Switch
              id="dark_mode"
              checked={isDarkMode}
              onCheckedChange={toggleTheme}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}