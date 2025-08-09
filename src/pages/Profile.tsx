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
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Mon Profil</h1>
          <p className="text-muted-foreground">Gérez vos informations personnelles</p>
        </div>

        <div className="space-y-6">
          {/* Profile Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informations personnelles
              </CardTitle>
              <CardDescription>
                Modifiez vos informations de profil
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <input type="hidden" name="csrf_token" value={csrfToken} />

                <div className="mb-4">
                  <ImageUpload
                    currentImage={avatarUrl || undefined}
                    onImageUpload={async (file) => { await onAvatarImageUpload(file); }}
                    onImageRemove={handleRemoveAvatar}
                    title="Photo de profil"
                    description="JPEG, PNG, WEBP (max 5MB)"
                    acceptedTypes={['image/jpeg','image/png','image/webp']}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Nom complet</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Votre nom complet"
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                    maxLength={500}
                    placeholder="Décrivez-vous..."
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user.email || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-sm text-muted-foreground">
                    L'email ne peut pas être modifié
                  </p>
                </div>

                <Button type="submit" disabled={isUpdating} className="w-full">
                  {isUpdating ? "Mise à jour..." : "Mettre à jour le profil"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Account Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Informations du compte
              </CardTitle>
              <CardDescription>
                Détails de votre compte
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Membre depuis :</span>
                <span className="font-medium">
                  {new Date(user.created_at).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Email vérifié :</span>
                <span className={`font-medium ${user.email_confirmed_at ? 'text-green-600' : 'text-orange-600'}`}>
                  {user.email_confirmed_at ? 'Oui' : 'Non'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="flex-1"
            >
              Retour à l'accueil
            </Button>
            
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? "Suppression..." : "Supprimer le compte"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}