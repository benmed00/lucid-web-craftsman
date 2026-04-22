import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { MapPin, Save, Loader2, AlertCircle, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchAppSettingIdValueMaybe,
  fetchAppSettingValueByKey,
  insertAppSettingRows,
  updateAppSettingByKey,
} from '@/services/appSettingsApi';
import type { Json } from '@/integrations/supabase/types';
import {
  CompanySettings,
  invalidateCompanySettingsCache,
} from '@/hooks/useCompanySettings';

const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  name: 'Rif Raw Straw',
  email: 'contact@rifstraw.com',
  phone: '+33 1 23 45 67 89',
  address: {
    street: '6 allée de la Sèvre',
    postalCode: '44400',
    city: 'Rezé',
    country: 'France',
    latitude: 47.1847,
    longitude: -1.5493,
  },
  openingHours: {
    weekdays: 'Lundi - Vendredi: 9h - 18h',
    saturday: 'Samedi: 10h - 16h',
    sunday: 'Dimanche: Fermé',
  },
};

interface CompanySettingsFormProps {
  className?: string;
}

export function CompanySettingsForm({ className }: CompanySettingsFormProps) {
  const [settings, setSettings] = useState<CompanySettings>(
    DEFAULT_COMPANY_SETTINGS
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const raw = await fetchAppSettingValueByKey('company_settings');

      if (raw != null && typeof raw === 'object') {
        const fetchedSettings = raw as unknown as Partial<CompanySettings>;
        setSettings({
          ...DEFAULT_COMPANY_SETTINGS,
          ...fetchedSettings,
          address: {
            ...DEFAULT_COMPANY_SETTINGS.address,
            ...(fetchedSettings.address || {}),
          },
          openingHours: {
            ...DEFAULT_COMPANY_SETTINGS.openingHours,
            ...(fetchedSettings.openingHours || {}),
          },
        });
      }
    } catch (error) {
      console.error('Error loading company settings:', error);
      toast.error('Erreur lors du chargement des paramètres');
    } finally {
      setIsLoading(false);
    }
  };

  const validateSettings = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!settings.name.trim()) {
      newErrors.name = 'Le nom est requis';
    }
    if (
      !settings.email.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.email)
    ) {
      newErrors.email = 'Email invalide';
    }
    if (!settings.address.street.trim()) {
      newErrors.street = "L'adresse est requise";
    }
    if (!settings.address.postalCode.trim()) {
      newErrors.postalCode = 'Le code postal est requis';
    }
    if (!settings.address.city.trim()) {
      newErrors.city = 'La ville est requise';
    }
    if (
      isNaN(settings.address.latitude) ||
      settings.address.latitude < -90 ||
      settings.address.latitude > 90
    ) {
      newErrors.latitude = 'Latitude invalide (-90 à 90)';
    }
    if (
      isNaN(settings.address.longitude) ||
      settings.address.longitude < -180 ||
      settings.address.longitude > 180
    ) {
      newErrors.longitude = 'Longitude invalide (-180 à 180)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveSettings = async () => {
    if (!validateSettings()) {
      toast.error('Veuillez corriger les erreurs');
      return;
    }

    setIsSaving(true);
    try {
      const existing = await fetchAppSettingIdValueMaybe('company_settings');

      const jsonValue = JSON.parse(JSON.stringify(settings)) as Json;

      if (existing?.id) {
        await updateAppSettingByKey('company_settings', {
          setting_value: jsonValue,
          updated_at: new Date().toISOString(),
        });
      } else {
        await insertAppSettingRows([
          {
            setting_key: 'company_settings',
            setting_value: jsonValue,
            description: 'Company contact and address settings',
          },
        ]);
      }

      // Invalidate cache so other components get fresh data
      invalidateCompanySettingsCache();

      toast.success("Paramètres de l'entreprise sauvegardés");
    } catch (error) {
      console.error('Error saving company settings:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const updateAddress = (
    field: keyof typeof settings.address,
    value: string | number
  ) => {
    setSettings((prev) => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value,
      },
    }));
    // Clear error for this field
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  const updateOpeningHours = (
    field: keyof typeof settings.openingHours,
    value: string
  ) => {
    setSettings((prev) => ({
      ...prev,
      openingHours: {
        ...prev.openingHours,
        [field]: value,
      },
    }));
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Building2 className="h-5 w-5 mr-2 text-primary" />
          Paramètres de l'entreprise
        </CardTitle>
        <CardDescription>
          Coordonnées et adresse affichées sur le site
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Company Info */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground">
            Informations générales
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Nom de l'entreprise</Label>
              <Input
                id="companyName"
                value={settings.name}
                onChange={(e) => {
                  setSettings((prev) => ({ ...prev, name: e.target.value }));
                  setErrors((prev) => ({ ...prev, name: '' }));
                }}
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyEmail">Email de contact</Label>
              <Input
                id="companyEmail"
                type="email"
                value={settings.email}
                onChange={(e) => {
                  setSettings((prev) => ({ ...prev, email: e.target.value }));
                  setErrors((prev) => ({ ...prev, email: '' }));
                }}
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.email}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyPhone">Téléphone</Label>
              <Input
                id="companyPhone"
                value={settings.phone}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, phone: e.target.value }))
                }
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Address */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Adresse de l'entreprise
          </h4>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="street">Adresse</Label>
              <Input
                id="street"
                value={settings.address.street}
                onChange={(e) => updateAddress('street', e.target.value)}
                placeholder="6 allée de la Sèvre"
                className={errors.street ? 'border-destructive' : ''}
              />
              {errors.street && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.street}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postalCode">Code postal</Label>
                <Input
                  id="postalCode"
                  value={settings.address.postalCode}
                  onChange={(e) => updateAddress('postalCode', e.target.value)}
                  placeholder="44400"
                  className={errors.postalCode ? 'border-destructive' : ''}
                />
                {errors.postalCode && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.postalCode}
                  </p>
                )}
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="city">Ville</Label>
                <Input
                  id="city"
                  value={settings.address.city}
                  onChange={(e) => updateAddress('city', e.target.value)}
                  placeholder="Rezé"
                  className={errors.city ? 'border-destructive' : ''}
                />
                {errors.city && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.city}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Pays</Label>
                <Input
                  id="country"
                  value={settings.address.country}
                  onChange={(e) => updateAddress('country', e.target.value)}
                  placeholder="France"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude (pour la carte)</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="0.0001"
                  value={settings.address.latitude}
                  onChange={(e) =>
                    updateAddress('latitude', parseFloat(e.target.value) || 0)
                  }
                  placeholder="47.1847"
                  className={errors.latitude ? 'border-destructive' : ''}
                />
                {errors.latitude && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.latitude}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude (pour la carte)</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="0.0001"
                  value={settings.address.longitude}
                  onChange={(e) =>
                    updateAddress('longitude', parseFloat(e.target.value) || 0)
                  }
                  placeholder="-1.5493"
                  className={errors.longitude ? 'border-destructive' : ''}
                />
                {errors.longitude && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.longitude}
                  </p>
                )}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              💡 Pour trouver les coordonnées GPS, utilisez{' '}
              <a
                href="https://www.google.com/maps"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Google Maps
              </a>{' '}
              et faites un clic droit sur votre adresse.
            </p>
          </div>
        </div>

        <Separator />

        {/* Opening Hours */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground">
            Horaires d'ouverture
          </h4>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weekdays">Jours de semaine</Label>
              <Input
                id="weekdays"
                value={settings.openingHours.weekdays}
                onChange={(e) => updateOpeningHours('weekdays', e.target.value)}
                placeholder="Lundi - Vendredi: 9h - 18h"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="saturday">Samedi</Label>
              <Input
                id="saturday"
                value={settings.openingHours.saturday}
                onChange={(e) => updateOpeningHours('saturday', e.target.value)}
                placeholder="Samedi: 10h - 16h"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sunday">Dimanche</Label>
              <Input
                id="sunday"
                value={settings.openingHours.sunday}
                onChange={(e) => updateOpeningHours('sunday', e.target.value)}
                placeholder="Dimanche: Fermé"
              />
            </div>
          </div>
        </div>

        <Separator />

        <Button onClick={saveSettings} disabled={isSaving} className="w-full">
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sauvegarde...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder les paramètres
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

export default CompanySettingsForm;
