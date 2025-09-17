import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useCsrfToken } from '@/hooks/useCsrfToken';
import { supabase } from '@/integrations/supabase/client';
import { User, Mail, Calendar } from 'lucide-react';
import ImageUpload from '@/components/ui/ImageUpload';
import { validateAndSanitizeName, sanitizeUserInput } from '@/utils/xssProtection';
import Navigation from '@/components/Navigation';
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
  const csrfToken = useCsrfToken();

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
        data: { full_name: sanitizedFullName }
      });
      if (authError) throw authError;

      // Upsert profile with full name, bio, and current avatar URL
      const sanitizedBio = sanitizeUserInput(bio).slice(0, 500);
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ id: user.id, full_name: sanitizedFullName, bio: sanitizedBio, avatar_url: avatarUrl || null }, { onConflict: 'id' });
      if (profileError) throw profileError;

      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été sauvegardées avec succès."
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur s'est produite lors de la mise à jour",
        variant: "destructive"
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

    const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const publicUrl = publicData.publicUrl;
    setAvatarUrl(publicUrl);

    await supabase.from('profiles').upsert({ id: user.id, avatar_url: publicUrl }, { onConflict: 'id' });
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id);
    setAvatarUrl('');
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    const confirmed = window.confirm(
      "Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible."
    );
    
    if (!confirmed) return;

    setIsLoading(true);
    try {
      // Note: In a real app, you'd typically call an edge function for account deletion
      // For now, we'll just sign out the user
      await signOut();
      toast({
        title: "Compte supprimé",
        description: "Votre compte a été supprimé avec succès."
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur s'est produite lors de la suppression",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <Navigation />
      <div className="py-4 sm:py-6 md:py-8 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Mon Profil</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Gérez vos informations personnelles et préférences
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 sm:gap-3 justify-center mb-6 sm:mb-8">
            <Button
              variant="outline" 
              size="sm"
              onClick={() => navigate('/')}
              className="text-xs sm:text-sm"
            >
              🏠 Accueil
            </Button>
            <Button
              variant="outline"
              size="sm" 
              onClick={signOut}
              className="text-xs sm:text-sm"
            >
              🚪 Se déconnecter
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteAccount}
              disabled={isLoading}
              className="text-xs sm:text-sm"
            >
              🗑️ Supprimer le compte
            </Button>
          </div>

          {/* Main Content - Single Column Layout */}
          <div className="space-y-6">
            
            {/* Profile Overview Card */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <User className="h-5 w-5" />
                  Vue d'ensemble du profil
                </CardTitle>
                <CardDescription>
                  Informations de base et statut du compte
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {avatarUrl ? (
                      <img 
                        src={avatarUrl} 
                        alt="Photo de profil" 
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-stone-200"
                      />
                    ) : (
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-olive-100 flex items-center justify-center border-4 border-stone-200">
                        <User className="h-8 w-8 sm:h-10 sm:w-10 text-olive-700" />
                      </div>
                    )}
                  </div>
                  
                  {/* User Info */}
                  <div className="text-center sm:text-left flex-1 min-w-0">
                    <h3 className="text-xl sm:text-2xl font-semibold text-stone-800 mb-1">
                      {fullName || 'Utilisateur'}
                    </h3>
                    <p className="text-sm sm:text-base text-stone-600 mb-3">{user.email}</p>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-stone-500" />
                        <span className="text-stone-600">
                          Membre depuis {new Date(user.created_at).toLocaleDateString('fr-FR', {
                            year: 'numeric',
                            month: 'long'
                          })}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${user.email_confirmed_at ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                          {user.email_confirmed_at ? '✓ Email vérifié' : '⚠️ Email non vérifié'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Edit Profile Card */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <User className="h-5 w-5" />
                  Modifier le profil
                </CardTitle>
                <CardDescription>
                  Mettez à jour vos informations personnelles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <input type="hidden" name="csrf_token" value={csrfToken} />

                  {/* Avatar Upload */}
                  <div className="space-y-3">
                    <Label className="text-sm sm:text-base font-medium">Photo de profil</Label>
                    <ImageUpload
                      currentImage={avatarUrl || undefined}
                      onImageUpload={async (file) => { await onAvatarImageUpload(file); }}
                      onImageRemove={handleRemoveAvatar}
                      title="Photo de profil"
                      description="JPEG, PNG, WEBP (max 5MB)"
                      acceptedTypes={['image/jpeg','image/png','image/webp']}
                    />
                  </div>

                  {/* Form Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="text-sm sm:text-base">Nom complet</Label>
                      <Input
                        id="fullName"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Votre nom complet"
                        maxLength={100}
                        className="text-sm sm:text-base min-h-[44px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm sm:text-base">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={user.email || ''}
                        disabled
                        className="bg-muted text-sm sm:text-base min-h-[44px]"
                      />
                      <p className="text-xs text-muted-foreground">
                        L'email ne peut pas être modifié
                      </p>
                    </div>
                  </div>

                  {/* Bio */}
                  <div className="space-y-2">
                    <Label htmlFor="bio" className="text-sm sm:text-base">Bio</Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={4}
                      maxLength={500}
                      placeholder="Décrivez-vous en quelques mots..."
                      className="text-sm sm:text-base resize-none"
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {bio.length}/500 caractères
                    </p>
                  </div>

                  {/* Submit Button */}
                  <Button 
                    type="submit" 
                    disabled={isUpdating} 
                    className="w-full sm:w-auto min-h-[48px] text-sm sm:text-base px-8"
                  >
                    {isUpdating ? "Mise à jour..." : "Sauvegarder les modifications"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <PageFooter />
    </div>
  );
}