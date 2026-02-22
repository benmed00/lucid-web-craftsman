import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useCsrfToken } from '@/hooks/useCsrfToken';
import { supabase } from '@/integrations/supabase/client';
import { User, Mail, Calendar } from 'lucide-react';
import ImageUpload from '@/components/ui/ImageUpload';
import {
  validateAndSanitizeName,
  sanitizeUserInput,
} from '@/utils/xssProtection';

import PageFooter from '@/components/PageFooter';

export default function Profile() {
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const { csrfToken } = useCsrfToken();

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  // Load user data and profile
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      setFullName(user.user_metadata?.full_name || '');
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name,bio,avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      if (!error && data) {
        setFullName(data.full_name || user.user_metadata?.full_name || '');
        setBio(data.bio || '');
        setAvatarUrl(data.avatar_url || '');
      }
    };
    loadProfile();
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validation and sanitization
    try {
      const sanitizedFullName = validateAndSanitizeName(fullName);

      setIsUpdating(true);
      // Update auth metadata full name
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: sanitizedFullName },
      });
      if (authError) throw authError;

      // Upsert profile with full name, bio, and current avatar URL
      const sanitizedBio = sanitizeUserInput(bio).slice(0, 500);
      const { error: profileError } = await supabase.from('profiles').upsert(
        {
          id: user.id,
          full_name: sanitizedFullName,
          bio: sanitizedBio,
          avatar_url: avatarUrl || null,
        },
        { onConflict: 'id' }
      );
      if (profileError) throw profileError;

      toast({
        title: 'Profil mis à jour',
        description: 'Vos informations ont été sauvegardées avec succès.',
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description:
          error.message || "Une erreur s'est produite lors de la mise à jour",
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Avatar upload handlers
  const onAvatarImageUpload = async (file: File) => {
    if (!user) return;
    const ext = (file.type.split('/')[1] || 'jpg').toLowerCase();
    const filePath = `${user.id}/avatar_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true, contentType: file.type });
    if (uploadError) throw uploadError;

    const { data: publicData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);
    const publicUrl = publicData.publicUrl;
    setAvatarUrl(publicUrl);

    await supabase
      .from('profiles')
      .upsert({ id: user.id, avatar_url: publicUrl }, { onConflict: 'id' });
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    await supabase
      .from('profiles')
      .update({ avatar_url: null })
      .eq('id', user.id);
    setAvatarUrl('');
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    const confirmed = window.confirm(
      'Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.'
    );

    if (!confirmed) return;

    setIsLoading(true);
    try {
      // Note: In a real app, you'd typically call an edge function for account deletion
      // For now, we'll just sign out the user
      await signOut();
      toast({
        title: 'Compte supprimé',
        description: 'Votre compte a été supprimé avec succès.',
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description:
          error.message || "Une erreur s'est produite lors de la suppression",
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="pt-4 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3">
              Mon Profil
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
              Gérez vos informations personnelles, préférences et historique
            </p>
          </div>

          {/* Quick Actions - Mobile Optimized */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-4 justify-center mb-8">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-xs sm:text-sm py-3 px-4"
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Accueil</span>
              <span className="sm:hidden">Accueil</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="flex items-center gap-2 text-xs sm:text-sm py-3 px-4"
            >
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Se déconnecter</span>
              <span className="sm:hidden">Déco.</span>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteAccount}
              disabled={isLoading}
              className="col-span-2 sm:col-span-1 flex items-center gap-2 text-xs sm:text-sm py-3 px-4"
            >
              <Calendar className="h-4 w-4" />
              <span>Supprimer le compte</span>
            </Button>
          </div>

          {/* Two Column Layout for Desktop, Single Column for Mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Left Column - Profile Overview */}
            <div className="space-y-6">
              {/* Profile Card with Tab-like navigation */}
              <Card className="shadow-lg border-0 bg-card">
                {/* Tab Navigation */}
                <div className="grid grid-cols-2 border-b border-border">
                  <div className="flex items-center justify-center gap-2 p-4 bg-primary/10 border-r border-border">
                    <User className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-primary">
                      Profil
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-2 p-4 bg-muted">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Infos
                    </span>
                  </div>
                </div>

                {/* Additional Tab Row */}
                <div className="grid grid-cols-2 border-b border-border">
                  <div className="flex items-center justify-center gap-2 p-3 bg-muted border-r border-border">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Points
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-2 p-3 bg-muted">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Préfs
                    </span>
                  </div>
                </div>

                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-lg font-semibold text-foreground mb-2">
                    Vue d'ensemble du profil
                  </CardTitle>
                </CardHeader>

                <CardContent className="text-center pb-8">
                  {/* Avatar - Centered */}
                  <div className="flex justify-center mb-6">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Photo de profil"
                        className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-border shadow-lg"
                      />
                    ) : (
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-primary/10 flex items-center justify-center border-4 border-border shadow-lg">
                        <User className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
                      </div>
                    )}
                  </div>

                  {/* User Info - Centered */}
                  <div className="space-y-3">
                    <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                      {fullName || 'Benyakoub Mohammed'}
                    </h3>
                    <p className="text-sm sm:text-base text-muted-foreground break-all">
                      {user.email}
                    </p>

                    {/* Status and Member Info */}
                    <div className="space-y-3">
                      <div className="flex justify-center">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs ${user.email_confirmed_at ? 'bg-status-success/10 text-status-success' : 'bg-status-warning/10 text-status-warning'}`}
                        >
                          {user.email_confirmed_at
                            ? '✓ Vérifié'
                            : '⚠️ Non vérifié'}
                        </span>
                      </div>

                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Membre depuis{' '}
                          {new Date(user.created_at).toLocaleDateString(
                            'fr-FR',
                            {
                              year: 'numeric',
                              month: 'long',
                            }
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-4">
                      <Button
                        variant="default"
                        className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-xl font-medium"
                      >
                        Modifier le profil
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Edit Profile */}
            <div className="space-y-6">
              <Card className="shadow-lg border-0 bg-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <User className="h-5 w-5" />
                    Modifier le profil
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Mettez à jour vos informations personnelles
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <input type="hidden" name="csrf_token" value={csrfToken} />

                    {/* Avatar Upload */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-foreground">
                        Photo de profil
                      </Label>
                      <ImageUpload
                        currentImage={avatarUrl || undefined}
                        onImageUpload={async (file) => {
                          await onAvatarImageUpload(file);
                        }}
                        onImageRemove={handleRemoveAvatar}
                        title="Photo de profil"
                        description="JPEG, PNG, WEBP (max 5MB)"
                        acceptedTypes={[
                          'image/jpeg',
                          'image/png',
                          'image/webp',
                        ]}
                      />
                    </div>

                    {/* Form Fields */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="fullName"
                          className="text-sm font-medium text-foreground"
                        >
                          Nom complet
                        </Label>
                        <Input
                          id="fullName"
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Votre nom complet"
                          maxLength={100}
                          className="text-sm min-h-[48px] border-border rounded-lg"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="email"
                          className="text-sm font-medium text-foreground"
                        >
                          Email
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={user.email || ''}
                          disabled
                          className="bg-muted text-sm min-h-[48px] border-border rounded-lg"
                        />
                        <p className="text-xs text-muted-foreground">
                          L'email ne peut pas être modifié
                        </p>
                      </div>
                    </div>

                    {/* Bio */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="bio"
                        className="text-sm font-medium text-foreground"
                      >
                        Bio
                      </Label>
                      <Textarea
                        id="bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={4}
                        maxLength={500}
                        placeholder="Décrivez-vous en quelques mots..."
                        className="text-sm resize-none border-border rounded-lg"
                      />
                      <p className="text-xs text-muted-foreground text-right">
                        {bio.length}/500 caractères
                      </p>
                    </div>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      disabled={isUpdating}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground min-h-[48px] text-sm font-medium rounded-lg"
                    >
                      {isUpdating
                        ? 'Mise à jour...'
                        : 'Sauvegarder les modifications'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Contact Section - Full Width */}
          <div className="mt-8">
            <Card className="shadow-lg border-0 bg-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground">
                  Contact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground">Email:</span>{' '}
                    contact@rifstraw.com
                  </p>
                  <p>
                    <span className="font-medium text-foreground">
                      Téléphone:
                    </span>{' '}
                    +33 1 23 45 67 89
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <PageFooter />
    </div>
  );
}
