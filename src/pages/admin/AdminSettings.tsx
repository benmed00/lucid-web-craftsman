import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  Save,
  Shield,
  Bell,
  Mail,
  Globe,
  Palette,
  Download,
  Upload,
  Trash2,
  Eye,
  EyeOff
} from "lucide-react";
import { toast } from "sonner";

const AdminSettings = () => {
  const [siteSettings, setSiteSettings] = useState({
    siteName: "Rif Raw Straw",
    siteDescription: "Artisanat berbère authentique du Rif marocain",
    contactEmail: "contact@rifrawstraw.com",
    contactPhone: "+33 1 23 45 67 89",
    address: "Paris, France",
    currency: "EUR",
    taxRate: 20,
    shippingCost: 5.90,
    freeShippingThreshold: 80
  });

  const [emailSettings, setEmailSettings] = useState({
    orderConfirmation: true,
    shipmentNotification: true,
    promotionalEmails: false,
    weeklyReport: true
  });

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    sessionTimeout: 60,
    allowMultipleLogins: false
  });

  const [displaySettings, setDisplaySettings] = useState({
    maintenanceMode: false,
    showOutOfStock: true,
    enableReviews: true,
    showPrices: true
  });

  const handleSaveSiteSettings = () => {
    // Save to Supabase
    toast.success("Paramètres du site sauvegardés");
  };

  const handleSaveEmailSettings = () => {
    // Save to Supabase
    toast.success("Paramètres email sauvegardés");
  };

  const handleSaveSecuritySettings = () => {
    // Save to Supabase
    toast.success("Paramètres de sécurité sauvegardés");
  };

  const handleSaveDisplaySettings = () => {
    // Save to Supabase
    toast.success("Paramètres d'affichage sauvegardés");
  };

  const handleExportData = () => {
    // Export data logic
    toast.success("Export des données en cours...");
  };

  const handleImportData = () => {
    // Import data logic
    toast.success("Import des données démarré...");
  };

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
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="siteDescription">Description</Label>
              <Textarea
                id="siteDescription"
                value={siteSettings.siteDescription}
                onChange={(e) => setSiteSettings({...siteSettings, siteDescription: e.target.value})}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Email de contact</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={siteSettings.contactEmail}
                  onChange={(e) => setSiteSettings({...siteSettings, contactEmail: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPhone">Téléphone</Label>
                <Input
                  id="contactPhone"
                  value={siteSettings.contactPhone}
                  onChange={(e) => setSiteSettings({...siteSettings, contactPhone: e.target.value})}
                />
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
                  value={siteSettings.taxRate}
                  onChange={(e) => setSiteSettings({...siteSettings, taxRate: Number(e.target.value)})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shippingCost">Frais de port (€)</Label>
                <Input
                  id="shippingCost"
                  type="number"
                  step="0.01"
                  value={siteSettings.shippingCost}
                  onChange={(e) => setSiteSettings({...siteSettings, shippingCost: Number(e.target.value)})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="freeShippingThreshold">Seuil livraison gratuite (€)</Label>
              <Input
                id="freeShippingThreshold"
                type="number"
                value={siteSettings.freeShippingThreshold}
                onChange={(e) => setSiteSettings({...siteSettings, freeShippingThreshold: Number(e.target.value)})}
              />
            </div>

            <Button onClick={handleSaveSiteSettings} className="w-full bg-olive-700 hover:bg-olive-800">
              <Save className="h-4 w-4 mr-2" />
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

            <Button onClick={handleSaveEmailSettings} className="w-full bg-blue-700 hover:bg-blue-800">
              <Save className="h-4 w-4 mr-2" />
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
                  value={securitySettings.sessionTimeout}
                  onChange={(e) => setSecuritySettings({...securitySettings, sessionTimeout: Number(e.target.value)})}
                />
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

            <Button onClick={handleSaveSecuritySettings} className="w-full bg-red-700 hover:bg-red-800">
              <Save className="h-4 w-4 mr-2" />
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

            <Button onClick={handleSaveDisplaySettings} className="w-full bg-purple-700 hover:bg-purple-800">
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder
            </Button>
          </CardContent>
        </Card>
      </div>

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

            <Button variant="outline" className="h-20 text-red-600 hover:text-red-700 hover:bg-red-50">
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