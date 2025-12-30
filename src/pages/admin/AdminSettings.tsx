import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { SecurityMonitoringCard } from "@/components/admin/SecurityMonitoringCard";
import { RateLimitsConfig } from "@/components/admin/RateLimitsConfig";
import { 
  Settings, 
  Save,
  Shield,
  Mail,
  Globe,
  Palette,
  Download,
  Upload,
  Trash2,
  Loader2,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

// Validation schemas
const siteSettingsSchema = z.object({
  siteName: z.string().min(1, "Le nom du site est requis").max(100, "Maximum 100 caractères"),
  siteDescription: z.string().max(500, "Maximum 500 caractères"),
  contactEmail: z.string().email("Format d'email invalide").max(255, "Maximum 255 caractères"),
  contactPhone: z.string().max(20, "Maximum 20 caractères"),
  address: z.string().max(200, "Maximum 200 caractères"),
  currency: z.string().min(1, "Devise requise"),
  taxRate: z.number().min(0, "Le taux doit être positif").max(100, "Maximum 100%"),
  shippingCost: z.number().min(0, "Les frais de port ne peuvent pas être négatifs"),
  freeShippingThreshold: z.number().min(0, "Le seuil doit être positif")
});

const securitySettingsSchema = z.object({
  twoFactorAuth: z.boolean(),
  sessionTimeout: z.number().min(5, "Minimum 5 minutes").max(1440, "Maximum 24 heures"),
  allowMultipleLogins: z.boolean()
});

interface SiteSettings {
  siteName: string;
  siteDescription: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  currency: string;
  taxRate: number;
  shippingCost: number;
  freeShippingThreshold: number;
}

interface EmailSettings {
  orderConfirmation: boolean;
  shipmentNotification: boolean;
  promotionalEmails: boolean;
  weeklyReport: boolean;
}

interface SecuritySettings {
  twoFactorAuth: boolean;
  sessionTimeout: number;
  allowMultipleLogins: boolean;
}

interface DisplaySettings {
  maintenanceMode: boolean;
  maintenanceReturnTime: string;
  maintenanceMessage: string;
  showOutOfStock: boolean;
  enableReviews: boolean;
  showPrices: boolean;
}

interface ValidationErrors {
  site: Record<string, string>;
  security: Record<string, string>;
}

const defaultSiteSettings: SiteSettings = {
  siteName: "Rif Raw Straw",
  siteDescription: "Artisanat berbère authentique du Rif marocain",
  contactEmail: "contact@rifrawstraw.com",
  contactPhone: "+33 1 23 45 67 89",
  address: "Paris, France",
  currency: "EUR",
  taxRate: 20,
  shippingCost: 5.90,
  freeShippingThreshold: 80
};

const defaultEmailSettings: EmailSettings = {
  orderConfirmation: true,
  shipmentNotification: true,
  promotionalEmails: false,
  weeklyReport: true
};

const defaultSecuritySettings: SecuritySettings = {
  twoFactorAuth: false,
  sessionTimeout: 60,
  allowMultipleLogins: false
};

const defaultDisplaySettings: DisplaySettings = {
  maintenanceMode: false,
  maintenanceReturnTime: '',
  maintenanceMessage: '',
  showOutOfStock: true,
  enableReviews: true,
  showPrices: true
};

const AdminSettings = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({
    site: {},
    security: {}
  });
  
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(defaultSiteSettings);
  const [emailSettings, setEmailSettings] = useState<EmailSettings>(defaultEmailSettings);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>(defaultSecuritySettings);
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>(defaultDisplaySettings);

  // Load settings from Supabase on mount
  useEffect(() => {
    loadAllSettings();
  }, []);

  const loadAllSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_key, setting_value');

      if (error) throw error;

      if (data) {
        data.forEach((setting) => {
          const value = setting.setting_value as Record<string, unknown>;
          
          switch (setting.setting_key) {
            case 'site_settings':
              setSiteSettings({ ...defaultSiteSettings, ...(value as unknown as Partial<SiteSettings>) });
              break;
            case 'email_settings':
              setEmailSettings({ ...defaultEmailSettings, ...(value as unknown as Partial<EmailSettings>) });
              break;
            case 'security_settings':
              setSecuritySettings({ ...defaultSecuritySettings, ...(value as unknown as Partial<SecuritySettings>) });
              break;
            case 'display_settings':
              setDisplaySettings({ ...defaultDisplaySettings, ...(value as unknown as Partial<DisplaySettings>) });
              break;
          }
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error("Erreur lors du chargement des paramètres");
    } finally {
      setIsLoading(false);
    }
  };

  const saveSetting = async (key: string, value: unknown) => {
    // Check if setting exists
    const { data: existing } = await supabase
      .from('app_settings')
      .select('id')
      .eq('setting_key', key)
      .single();

    const jsonValue = JSON.parse(JSON.stringify(value));

    if (existing) {
      // Update existing
      const { error } = await supabase
        .from('app_settings')
        .update({
          setting_value: jsonValue,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', key);

      if (error) throw error;
    } else {
      // Insert new
      const { error } = await supabase
        .from('app_settings')
        .insert([{
          setting_key: key,
          setting_value: jsonValue,
          description: `${key} configuration`
        }]);

      if (error) throw error;
    }
  };

  const validateSiteSettings = (): boolean => {
    const result = siteSettingsSchema.safeParse(siteSettings);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        errors[field] = err.message;
      });
      setValidationErrors(prev => ({ ...prev, site: errors }));
      return false;
    }
    setValidationErrors(prev => ({ ...prev, site: {} }));
    return true;
  };

  const validateSecuritySettings = (): boolean => {
    const result = securitySettingsSchema.safeParse(securitySettings);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        errors[field] = err.message;
      });
      setValidationErrors(prev => ({ ...prev, security: errors }));
      return false;
    }
    setValidationErrors(prev => ({ ...prev, security: {} }));
    return true;
  };

  const handleSaveSiteSettings = async () => {
    if (!validateSiteSettings()) {
      toast.error("Veuillez corriger les erreurs de validation");
      return;
    }

    setIsSaving('site');
    try {
      await saveSetting('site_settings', siteSettings);
      toast.success("Paramètres du site sauvegardés");
    } catch (error) {
      console.error('Error saving site settings:', error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setIsSaving(null);
    }
  };

  const handleSaveEmailSettings = async () => {
    setIsSaving('email');
    try {
      await saveSetting('email_settings', emailSettings);
      toast.success("Paramètres email sauvegardés");
    } catch (error) {
      console.error('Error saving email settings:', error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setIsSaving(null);
    }
  };

  const handleSaveSecuritySettings = async () => {
    if (!validateSecuritySettings()) {
      toast.error("Veuillez corriger les erreurs de validation");
      return;
    }

    setIsSaving('security');
    try {
      await saveSetting('security_settings', securitySettings);
      toast.success("Paramètres de sécurité sauvegardés");
    } catch (error) {
      console.error('Error saving security settings:', error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setIsSaving(null);
    }
  };

  const handleSaveDisplaySettings = async () => {
    setIsSaving('display');
    try {
      await saveSetting('display_settings', displaySettings);
      toast.success("Paramètres d'affichage sauvegardés");
    } catch (error) {
      console.error('Error saving display settings:', error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setIsSaving(null);
    }
  };

  const handleExportData = async () => {
    try {
      // Export all settings as JSON
      const exportData = {
        site_settings: siteSettings,
        email_settings: emailSettings,
        security_settings: securitySettings,
        display_settings: displaySettings,
        exported_at: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rifrawstraw-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("Export des paramètres terminé");
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error("Erreur lors de l'export");
    }
  };

  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        if (data.site_settings) {
          setSiteSettings({ ...defaultSiteSettings, ...data.site_settings });
          await saveSetting('site_settings', { ...defaultSiteSettings, ...data.site_settings });
        }
        if (data.email_settings) {
          setEmailSettings({ ...defaultEmailSettings, ...data.email_settings });
          await saveSetting('email_settings', { ...defaultEmailSettings, ...data.email_settings });
        }
        if (data.security_settings) {
          setSecuritySettings({ ...defaultSecuritySettings, ...data.security_settings });
          await saveSetting('security_settings', { ...defaultSecuritySettings, ...data.security_settings });
        }
        if (data.display_settings) {
          setDisplaySettings({ ...defaultDisplaySettings, ...data.display_settings });
          await saveSetting('display_settings', { ...defaultDisplaySettings, ...data.display_settings });
        }
        
        toast.success("Import des paramètres terminé");
      } catch (error) {
        console.error('Error importing data:', error);
        toast.error("Erreur lors de l'import - format invalide");
      }
    };
    input.click();
  };

  const handleResetSettings = async () => {
    if (!confirm("Êtes-vous sûr de vouloir réinitialiser tous les paramètres ?")) return;
    
    try {
      setSiteSettings(defaultSiteSettings);
      setEmailSettings(defaultEmailSettings);
      setSecuritySettings(defaultSecuritySettings);
      setDisplaySettings(defaultDisplaySettings);
      
      await Promise.all([
        saveSetting('site_settings', defaultSiteSettings),
        saveSetting('email_settings', defaultEmailSettings),
        saveSetting('security_settings', defaultSecuritySettings),
        saveSetting('display_settings', defaultDisplaySettings)
      ]);
      
      toast.success("Paramètres réinitialisés");
    } catch (error) {
      console.error('Error resetting settings:', error);
      toast.error("Erreur lors de la réinitialisation");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-olive-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-serif font-semibold text-stone-800">
          Paramètres
        </h2>
        <p className="text-stone-600">
          Gérez les paramètres de votre boutique et de votre compte
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Site Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Globe className="h-5 w-5 mr-2 text-olive-600" />
              Paramètres du site
            </CardTitle>
            <CardDescription>
              Configuration générale de votre boutique
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="siteName">Nom du site</Label>
              <Input
                id="siteName"
                value={siteSettings.siteName}
                onChange={(e) => setSiteSettings({...siteSettings, siteName: e.target.value})}
                className={validationErrors.site.siteName ? "border-red-500" : ""}
              />
              {validationErrors.site.siteName && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {validationErrors.site.siteName}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="siteDescription">Description</Label>
              <Textarea
                id="siteDescription"
                value={siteSettings.siteDescription}
                onChange={(e) => setSiteSettings({...siteSettings, siteDescription: e.target.value})}
                rows={3}
                className={validationErrors.site.siteDescription ? "border-red-500" : ""}
              />
              {validationErrors.site.siteDescription && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {validationErrors.site.siteDescription}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Email de contact</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={siteSettings.contactEmail}
                  onChange={(e) => setSiteSettings({...siteSettings, contactEmail: e.target.value})}
                  className={validationErrors.site.contactEmail ? "border-red-500" : ""}
                />
                {validationErrors.site.contactEmail && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {validationErrors.site.contactEmail}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPhone">Téléphone</Label>
                <Input
                  id="contactPhone"
                  value={siteSettings.contactPhone}
                  onChange={(e) => setSiteSettings({...siteSettings, contactPhone: e.target.value})}
                  className={validationErrors.site.contactPhone ? "border-red-500" : ""}
                />
                {validationErrors.site.contactPhone && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {validationErrors.site.contactPhone}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Adresse</Label>
              <Input
                id="address"
                value={siteSettings.address}
                onChange={(e) => setSiteSettings({...siteSettings, address: e.target.value})}
              />
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taxRate">Taux de TVA (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  min="0"
                  max="100"
                  value={siteSettings.taxRate}
                  onChange={(e) => setSiteSettings({...siteSettings, taxRate: Number(e.target.value)})}
                  className={validationErrors.site.taxRate ? "border-red-500" : ""}
                />
                {validationErrors.site.taxRate && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {validationErrors.site.taxRate}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="shippingCost">Frais de port (€)</Label>
                <Input
                  id="shippingCost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={siteSettings.shippingCost}
                  onChange={(e) => setSiteSettings({...siteSettings, shippingCost: Number(e.target.value)})}
                  className={validationErrors.site.shippingCost ? "border-red-500" : ""}
                />
                {validationErrors.site.shippingCost && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {validationErrors.site.shippingCost}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="freeShippingThreshold">Seuil livraison gratuite (€)</Label>
              <Input
                id="freeShippingThreshold"
                type="number"
                min="0"
                value={siteSettings.freeShippingThreshold}
                onChange={(e) => setSiteSettings({...siteSettings, freeShippingThreshold: Number(e.target.value)})}
                className={validationErrors.site.freeShippingThreshold ? "border-red-500" : ""}
              />
              {validationErrors.site.freeShippingThreshold && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {validationErrors.site.freeShippingThreshold}
                </p>
              )}
            </div>

            <Button 
              onClick={handleSaveSiteSettings} 
              className="w-full bg-olive-700 hover:bg-olive-800"
              disabled={isSaving === 'site'}
            >
              {isSaving === 'site' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Sauvegarder
            </Button>
          </CardContent>
        </Card>

        {/* Email Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mail className="h-5 w-5 mr-2 text-blue-600" />
              Paramètres email
            </CardTitle>
            <CardDescription>
              Configuration des notifications par email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Confirmation de commande</Label>
                  <p className="text-sm text-stone-600">
                    Envoyer un email de confirmation aux clients
                  </p>
                </div>
                <Switch
                  checked={emailSettings.orderConfirmation}
                  onCheckedChange={(checked) => 
                    setEmailSettings({...emailSettings, orderConfirmation: checked})
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notification d'expédition</Label>
                  <p className="text-sm text-stone-600">
                    Informer les clients de l'expédition
                  </p>
                </div>
                <Switch
                  checked={emailSettings.shipmentNotification}
                  onCheckedChange={(checked) => 
                    setEmailSettings({...emailSettings, shipmentNotification: checked})
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Emails promotionnels</Label>
                  <p className="text-sm text-stone-600">
                    Newsletters et offres spéciales
                  </p>
                </div>
                <Switch
                  checked={emailSettings.promotionalEmails}
                  onCheckedChange={(checked) => 
                    setEmailSettings({...emailSettings, promotionalEmails: checked})
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Rapport hebdomadaire</Label>
                  <p className="text-sm text-stone-600">
                    Résumé des ventes et statistiques
                  </p>
                </div>
                <Switch
                  checked={emailSettings.weeklyReport}
                  onCheckedChange={(checked) => 
                    setEmailSettings({...emailSettings, weeklyReport: checked})
                  }
                />
              </div>
            </div>

            <Button 
              onClick={handleSaveEmailSettings} 
              className="w-full bg-blue-700 hover:bg-blue-800"
              disabled={isSaving === 'email'}
            >
              {isSaving === 'email' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Sauvegarder
            </Button>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2 text-red-600" />
              Sécurité
            </CardTitle>
            <CardDescription>
              Paramètres de sécurité de votre compte
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Authentification à deux facteurs</Label>
                  <p className="text-sm text-stone-600">
                    Sécurité renforcée pour votre compte
                  </p>
                </div>
                <Switch
                  checked={securitySettings.twoFactorAuth}
                  onCheckedChange={(checked) => 
                    setSecuritySettings({...securitySettings, twoFactorAuth: checked})
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sessionTimeout">Timeout de session (minutes)</Label>
                <Input
                  id="sessionTimeout"
                  type="number"
                  min="5"
                  max="1440"
                  value={securitySettings.sessionTimeout}
                  onChange={(e) => setSecuritySettings({...securitySettings, sessionTimeout: Number(e.target.value)})}
                  className={validationErrors.security.sessionTimeout ? "border-red-500" : ""}
                />
                {validationErrors.security.sessionTimeout && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {validationErrors.security.sessionTimeout}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Connexions multiples</Label>
                  <p className="text-sm text-stone-600">
                    Autoriser plusieurs sessions simultanées
                  </p>
                </div>
                <Switch
                  checked={securitySettings.allowMultipleLogins}
                  onCheckedChange={(checked) => 
                    setSecuritySettings({...securitySettings, allowMultipleLogins: checked})
                  }
                />
              </div>
            </div>

            <Button 
              onClick={handleSaveSecuritySettings} 
              className="w-full bg-red-700 hover:bg-red-800"
              disabled={isSaving === 'security'}
            >
              {isSaving === 'security' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Sauvegarder
            </Button>
          </CardContent>
        </Card>

        {/* Display Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Palette className="h-5 w-5 mr-2 text-purple-600" />
              Affichage
            </CardTitle>
            <CardDescription>
              Paramètres d'affichage de votre boutique
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center">
                    Mode maintenance
                    {displaySettings.maintenanceMode && (
                      <Badge variant="destructive" className="ml-2">Actif</Badge>
                    )}
                  </Label>
                  <p className="text-sm text-stone-600">
                    Désactiver temporairement le site
                  </p>
                </div>
                <Switch
                  checked={displaySettings.maintenanceMode}
                  onCheckedChange={(checked) => 
                    setDisplaySettings({...displaySettings, maintenanceMode: checked})
                  }
                />
              </div>

              {displaySettings.maintenanceMode && (
                <div className="space-y-4 pl-4 border-l-2 border-destructive/20">
                  <div className="space-y-2">
                    <Label htmlFor="maintenanceReturnTime">Heure de retour estimée</Label>
                    <Input
                      id="maintenanceReturnTime"
                      type="datetime-local"
                      value={displaySettings.maintenanceReturnTime}
                      onChange={(e) => 
                        setDisplaySettings({...displaySettings, maintenanceReturnTime: e.target.value})
                      }
                      className="max-w-xs"
                    />
                    <p className="text-sm text-stone-600">
                      Affichée sur la page de maintenance
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maintenanceMessage">Message personnalisé</Label>
                    <Textarea
                      id="maintenanceMessage"
                      placeholder="Message optionnel à afficher sur la page de maintenance..."
                      value={displaySettings.maintenanceMessage}
                      onChange={(e) => 
                        setDisplaySettings({...displaySettings, maintenanceMessage: e.target.value})
                      }
                      rows={3}
                    />
                    <p className="text-sm text-stone-600">
                      Laissez vide pour utiliser le message par défaut
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Produits en rupture de stock</Label>
                  <p className="text-sm text-stone-600">
                    Afficher les produits non disponibles
                  </p>
                </div>
                <Switch
                  checked={displaySettings.showOutOfStock}
                  onCheckedChange={(checked) => 
                    setDisplaySettings({...displaySettings, showOutOfStock: checked})
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Système d'avis clients</Label>
                  <p className="text-sm text-stone-600">
                    Permettre aux clients de laisser des avis
                  </p>
                </div>
                <Switch
                  checked={displaySettings.enableReviews}
                  onCheckedChange={(checked) => 
                    setDisplaySettings({...displaySettings, enableReviews: checked})
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Affichage des prix</Label>
                  <p className="text-sm text-stone-600">
                    Montrer les prix sur le site
                  </p>
                </div>
                <Switch
                  checked={displaySettings.showPrices}
                  onCheckedChange={(checked) => 
                    setDisplaySettings({...displaySettings, showPrices: checked})
                  }
                />
              </div>
            </div>

            <Button 
              onClick={handleSaveDisplaySettings} 
              className="w-full bg-purple-700 hover:bg-purple-800"
              disabled={isSaving === 'display'}
            >
              {isSaving === 'display' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Sauvegarder
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Security Monitoring */}
      <SecurityMonitoringCard />

      {/* Rate Limits Configuration */}
      <RateLimitsConfig />

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2 text-stone-600" />
            Gestion des données
          </CardTitle>
          <CardDescription>
            Import, export et sauvegarde de vos données
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button onClick={handleExportData} variant="outline" className="h-20">
              <div className="text-center">
                <Download className="h-6 w-6 mb-2 mx-auto" />
                <span>Exporter les données</span>
              </div>
            </Button>

            <Button onClick={handleImportData} variant="outline" className="h-20">
              <div className="text-center">
                <Upload className="h-6 w-6 mb-2 mx-auto" />
                <span>Importer les données</span>
              </div>
            </Button>

            <Button 
              onClick={handleResetSettings} 
              variant="outline" 
              className="h-20 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <div className="text-center">
                <Trash2 className="h-6 w-6 mb-2 mx-auto" />
                <span>Réinitialiser</span>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettings;
