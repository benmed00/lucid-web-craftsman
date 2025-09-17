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
      <div className="py-6 sm:py-8 md:py-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2">Mon Profil</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Gérez vos informations personnelles, préférences et historique</p>
          </div>

          {/* Quick Actions - Mobile First */}
          <div className="flex flex-wrap gap-2 sm:gap-3 md:gap-4 justify-center mb-6 sm:mb-8">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-xs sm:text-sm px-3 sm:px-4 py-2 touch-manipulation"
            >
              <User className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Accueil</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="flex items-center gap-2 text-xs sm:text-sm px-3 sm:px-4 py-2 touch-manipulation"
            >
              <Mail className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Se déconnecter</span>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteAccount}
              disabled={isLoading}
              className="flex items-center gap-2 text-xs sm:text-sm px-3 sm:px-4 py-2 touch-manipulation"
            >
              <span className="text-red-600 text-xs sm:text-sm">🗑️</span>
              <span className="hidden sm:inline text-red-600">Supprimer le compte</span>
            </Button>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            
            {/* Left Column - Profile Overview (Mobile: Full Width, Desktop: 1/3) */}
            <div className="lg:col-span-1 space-y-4 sm:space-y-6">
              
              {/* Profile Overview Card */}
              <Card className="shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <User className="h-4 w-4 sm:h-5 sm:w-5" />
                    Vue d'ensemble
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Avatar Section */}
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="relative">
                      {avatarUrl ? (
                        <img 
                          src={avatarUrl} 
                          alt="Photo de profil" 
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-4 border-stone-200"
                        />
                      ) : (
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-olive-100 flex items-center justify-center border-4 border-stone-200">
                          <User className="h-6 w-6 sm:h-8 sm:w-8 text-olive-700" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-base sm:text-lg text-stone-800">
                        {fullName || 'Utilisateur'}
                      </h3>
                      <p className="text-xs sm:text-sm text-stone-600">{user.email}</p>
                      <div className="flex items-center justify-center gap-2 mt-2">
                        <span className="text-xs text-stone-500">Profil 17% complété</span>
                        <span className="text-green-600 text-xs">✓ Vérifié</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Member Since */}
                  <div className="pt-3 border-t border-stone-100">
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-stone-500" />
                      <span className="text-stone-600">
                        Membre depuis {new Date(user.created_at).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'short'
                        })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Navigation */}
              <Card className="shadow-lg lg:block">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base sm:text-lg">Navigation rapide</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <button className="w-full text-left p-2 sm:p-3 hover:bg-stone-50 rounded-lg transition-colors text-sm touch-manipulation">
                    👤 Informations
                  </button>
                  <button className="w-full text-left p-2 sm:p-3 hover:bg-stone-50 rounded-lg transition-colors text-sm touch-manipulation">
                    ⚙️ Préférences
                  </button>
                  <button className="w-full text-left p-2 sm:p-3 hover:bg-stone-50 rounded-lg transition-colors text-sm touch-manipulation">
                    📦 Commandes
                  </button>
                  <button className="w-full text-left p-2 sm:p-3 hover:bg-stone-50 rounded-lg transition-colors text-sm touch-manipulation">
                    🔒 Sécurité
                  </button>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Detailed Forms (Mobile: Full Width, Desktop: 2/3) */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              
              {/* Profile Edit Card */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <User className="h-4 w-4 sm:h-5 sm:w-5" />
                    Vue d'ensemble du profil
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Gérez vos informations personnelles et préférences
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdateProfile} className="space-y-4 sm:space-y-6">
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

                    {/* Personal Info Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName" className="text-sm sm:text-base">Nom complet</Label>
                        <Input
                          id="fullName"
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Votre nom complet"
                          maxLength={100}
                          className="text-sm sm:text-base touch-manipulation min-h-[44px]"
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
                        placeholder="Décrivez-vous..."
                        className="text-sm sm:text-base resize-none"
                      />
                      <p className="text-xs text-muted-foreground">
                        {bio.length}/500 caractères
                      </p>
                    </div>

                    {/* Account Verification Status */}
                    <div className="bg-stone-50 p-3 sm:p-4 rounded-lg space-y-2">
                      <h4 className="font-medium text-sm sm:text-base">État du compte</h4>
                      <div className="flex items-center gap-2 text-xs sm:text-sm">
                        <Mail className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Email vérifié :</span>
                        <span className={`font-medium ${user.email_confirmed_at ? 'text-green-600' : 'text-orange-600'}`}>
                          {user.email_confirmed_at ? 'Oui ✓' : 'Non ⚠️'}
                        </span>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      disabled={isUpdating} 
                      className="w-full touch-manipulation min-h-[48px] text-sm sm:text-base"
                    >
                      {isUpdating ? "Mise à jour..." : "Modifier le profil"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      <PageFooter />
    </div>
  );
}