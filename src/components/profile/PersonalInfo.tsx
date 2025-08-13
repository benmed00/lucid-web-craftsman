import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { MapPin, Globe, Instagram, Facebook, Twitter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sanitizeUserInput } from '@/utils/xssProtection';

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

interface PersonalInfoProps {
  user: User;
  profile: Profile | null;
  onProfileUpdate: (updatedProfile: Profile) => void;
}

export function PersonalInfo({ user, profile, onProfileUpdate }: PersonalInfoProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [addressData, setAddressData] = useState({
    address_line1: profile?.address_line1 || '',
    address_line2: profile?.address_line2 || '',
    city: profile?.city || '',
    postal_code: profile?.postal_code || '',
    country: profile?.country || ''
  });

  const [socialData, setSocialData] = useState({
    website_url: profile?.website_url || '',
    instagram_handle: profile?.instagram_handle || '',
    facebook_url: profile?.facebook_url || '',
    twitter_handle: profile?.twitter_handle || ''
  });

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const sanitizedData = {
        address_line1: addressData.address_line1 ? sanitizeUserInput(addressData.address_line1) : null,
        address_line2: addressData.address_line2 ? sanitizeUserInput(addressData.address_line2) : null,
        city: addressData.city ? sanitizeUserInput(addressData.city) : null,
        postal_code: addressData.postal_code ? sanitizeUserInput(addressData.postal_code) : null,
        country: addressData.country ? sanitizeUserInput(addressData.country) : null
      };

      const { data, error } = await supabase
        .from('profiles')
        .update(sanitizedData)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      onProfileUpdate(data);
      toast.success('Adresse mise à jour avec succès');
    } catch (error: any) {
      console.error('Error updating address:', error);
      toast.error('Erreur lors de la mise à jour de l\'adresse');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const sanitizedData = {
        website_url: socialData.website_url ? sanitizeUserInput(socialData.website_url) : null,
        instagram_handle: socialData.instagram_handle ? sanitizeUserInput(socialData.instagram_handle.replace('@', '')) : null,
        facebook_url: socialData.facebook_url ? sanitizeUserInput(socialData.facebook_url) : null,
        twitter_handle: socialData.twitter_handle ? sanitizeUserInput(socialData.twitter_handle.replace('@', '')) : null
      };

      const { data, error } = await supabase
        .from('profiles')
        .update(sanitizedData)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      onProfileUpdate(data);
      toast.success('Liens sociaux mis à jour avec succès');
    } catch (error: any) {
      console.error('Error updating social links:', error);
      toast.error('Erreur lors de la mise à jour des liens sociaux');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Address Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Adresse
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddressSubmit} className="space-y-4">
            <div>
              <Label htmlFor="address_line1">Adresse ligne 1</Label>
              <Input
                id="address_line1"
                value={addressData.address_line1}
                onChange={(e) => setAddressData({ ...addressData, address_line1: e.target.value })}
                placeholder="123 Rue de la Paix"
              />
            </div>

            <div>
              <Label htmlFor="address_line2">Adresse ligne 2 (optionnel)</Label>
              <Input
                id="address_line2"
                value={addressData.address_line2}
                onChange={(e) => setAddressData({ ...addressData, address_line2: e.target.value })}
                placeholder="Appartement, étage..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">Ville</Label>
                <Input
                  id="city"
                  value={addressData.city}
                  onChange={(e) => setAddressData({ ...addressData, city: e.target.value })}
                  placeholder="Paris"
                />
              </div>
              <div>
                <Label htmlFor="postal_code">Code postal</Label>
                <Input
                  id="postal_code"
                  value={addressData.postal_code}
                  onChange={(e) => setAddressData({ ...addressData, postal_code: e.target.value })}
                  placeholder="75001"
                />
              </div>
              <div>
                <Label htmlFor="country">Pays</Label>
                <Input
                  id="country"
                  value={addressData.country}
                  onChange={(e) => setAddressData({ ...addressData, country: e.target.value })}
                  placeholder="France"
                />
              </div>
            </div>

            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Sauvegarde...' : 'Mettre à jour l\'adresse'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Social Media Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Liens sociaux
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSocialSubmit} className="space-y-4">
            <div>
              <Label htmlFor="website_url" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Site web
              </Label>
              <Input
                id="website_url"
                type="url"
                value={socialData.website_url}
                onChange={(e) => setSocialData({ ...socialData, website_url: e.target.value })}
                placeholder="https://votre-site.com"
              />
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="instagram_handle" className="flex items-center gap-2">
                  <Instagram className="h-4 w-4" />
                  Instagram
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">@</span>
                  <Input
                    id="instagram_handle"
                    value={socialData.instagram_handle}
                    onChange={(e) => setSocialData({ ...socialData, instagram_handle: e.target.value })}
                    placeholder="nom_utilisateur"
                    className="pl-8"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="facebook_url" className="flex items-center gap-2">
                  <Facebook className="h-4 w-4" />
                  Facebook
                </Label>
                <Input
                  id="facebook_url"
                  type="url"
                  value={socialData.facebook_url}
                  onChange={(e) => setSocialData({ ...socialData, facebook_url: e.target.value })}
                  placeholder="https://facebook.com/profil"
                />
              </div>

              <div>
                <Label htmlFor="twitter_handle" className="flex items-center gap-2">
                  <Twitter className="h-4 w-4" />
                  Twitter
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">@</span>
                  <Input
                    id="twitter_handle"
                    value={socialData.twitter_handle}
                    onChange={(e) => setSocialData({ ...socialData, twitter_handle: e.target.value })}
                    placeholder="nom_utilisateur"
                    className="pl-8"
                  />
                </div>
              </div>
            </div>

            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Sauvegarde...' : 'Mettre à jour les liens'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}