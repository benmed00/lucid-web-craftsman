import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Phone, Mail, User as UserIcon, Shield } from 'lucide-react';
import ImageUpload from '@/components/ui/ImageUpload';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { validateAndSanitizeName, sanitizeUserInput } from '@/utils/xssProtection';

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

interface ProfileOverviewProps {
  user: User;
  profile: Profile | null;
  onProfileUpdate: (updatedProfile: Profile) => void;
}

export function ProfileOverview({ user, profile, onProfileUpdate }: ProfileOverviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    bio: profile?.bio || '',
    phone: profile?.phone || '',
    location: profile?.location || '',
    address_line1: profile?.address_line1 || '',
    address_line2: profile?.address_line2 || '',
    city: profile?.city || '',
    postal_code: profile?.postal_code || '',
    country: profile?.country || '',
    website_url: profile?.website_url || '',
    instagram_handle: profile?.instagram_handle || '',
    facebook_url: profile?.facebook_url || '',
    twitter_handle: profile?.twitter_handle || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate and sanitize input
      const sanitizedData = {
        full_name: formData.full_name ? validateAndSanitizeName(formData.full_name) : null,
        bio: formData.bio ? sanitizeUserInput(formData.bio).substring(0, 500) : null,
        phone: formData.phone ? sanitizeUserInput(formData.phone) : null,
        location: formData.location ? sanitizeUserInput(formData.location) : null,
        address_line1: formData.address_line1 ? sanitizeUserInput(formData.address_line1) : null,
        address_line2: formData.address_line2 ? sanitizeUserInput(formData.address_line2) : null,
        city: formData.city ? sanitizeUserInput(formData.city) : null,
        postal_code: formData.postal_code ? sanitizeUserInput(formData.postal_code) : null,
        country: formData.country ? sanitizeUserInput(formData.country) : null,
        website_url: formData.website_url ? sanitizeUserInput(formData.website_url) : null,
        instagram_handle: formData.instagram_handle ? sanitizeUserInput(formData.instagram_handle) : null,
        facebook_url: formData.facebook_url ? sanitizeUserInput(formData.facebook_url) : null,
        twitter_handle: formData.twitter_handle ? sanitizeUserInput(formData.twitter_handle) : null
      };

      const { data, error } = await supabase
        .from('profiles')
        .update(sanitizedData)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      onProfileUpdate(data);
      setIsEditing(false);
      toast.success('Profil mis à jour avec succès');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Erreur lors de la mise à jour du profil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = async (file: File, _previewUrl?: string) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload with timeout to prevent hanging
      const uploadPromise = supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Upload timeout after 30s')), 30000)
      );

      const { error: uploadError } = await Promise.race([uploadPromise, timeoutPromise]);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      if (profile) {
        onProfileUpdate({ ...profile, avatar_url: data.publicUrl });
      }

      toast.success('Avatar mis à jour avec succès');
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error(error.message || 'Erreur lors du téléchargement de l\'avatar');
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id);

      if (error) throw error;

      if (profile) {
        onProfileUpdate({ ...profile, avatar_url: null });
      }

      toast.success('Avatar supprimé avec succès');
    } catch (error: any) {
      console.error('Error removing avatar:', error);
      toast.error('Erreur lors de la suppression de l\'avatar');
    }
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            Vue d'ensemble du profil
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-start gap-6 md:gap-8 min-w-0">
            {/* Avatar Section */}
            <div className="flex flex-col items-center space-y-4 flex-shrink-0">
              <Avatar className="h-32 w-32">
                <AvatarImage src={profile?.avatar_url || ''} alt="Avatar" />
                <AvatarFallback className="text-2xl">
                  {profile?.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              
              {isEditing && (
                <div className="space-y-2">
                  <ImageUpload onImageUpload={handleAvatarUpload} />
                  {profile?.avatar_url && (
                    <Button variant="outline" size="sm" onClick={handleRemoveAvatar}>
                      Supprimer l'avatar
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 space-y-4 min-w-0">
              {isEditing ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="full_name">Nom complet</Label>
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        placeholder="Votre nom complet"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Téléphone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+33 1 23 45 67 89"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="bio">Biographie</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      placeholder="Parlez-nous de vous..."
                      rows={3}
                      maxLength={500}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="location">Localisation</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="Ville, Pays"
                      />
                    </div>
                    <div>
                      <Label htmlFor="website_url">Site web</Label>
                      <Input
                        id="website_url"
                        value={formData.website_url}
                        onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                        placeholder="https://votre-site.com"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? 'Sauvegarde...' : 'Sauvegarder'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsEditing(false)}
                    >
                      Annuler
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold">
                      {profile?.full_name || 'Nom non renseigné'}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span className="break-all">
                        {user.email}
                      </span>
                      {user.email_confirmed_at && (
                        <Badge variant="secondary" className="text-xs whitespace-nowrap">
                          <Shield className="h-3 w-3 mr-1" />
                          Vérifié
                        </Badge>
                      )}
                    </div>
                  </div>

                  {profile?.bio && (
                    <p className="text-muted-foreground">{profile.bio}</p>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {profile?.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{profile.phone}</span>
                      </div>
                    )}
                    
                    {profile?.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{profile.location}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Membre depuis {format(new Date(user.created_at || ''), 'MMMM yyyy', { locale: fr })}
                      </span>
                    </div>
                  </div>

                  <Button 
                    onClick={() => setIsEditing(true)}
                    id="edit-profile-button"
                    name="edit-profile-action"
                  >
                    Modifier le profil
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}