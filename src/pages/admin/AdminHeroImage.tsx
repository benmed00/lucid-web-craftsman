import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Save, 
  Image as ImageIcon, 
  Monitor,
  Smartphone,
  Eye,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import ImageUpload from "@/components/ui/ImageUpload";

interface HeroImageSettings {
  url: string;
  alt: string;
  title: string;
  subtitle: string;
}

const AdminHeroImageManager = () => {
  const [heroSettings, setHeroSettings] = useState<HeroImageSettings>({
    url: "/lovable-uploads/8937573b-31a4-4669-8ea2-8e6c35b45b81.png",
    alt: "Chapeau artisanal et sac traditionnel fait main - Artisanat authentique du Rif",
    title: "Artisanat Authentique du Rif",
    subtitle: "Chapeau tressé et sac naturel - Fait main avec amour"
  });

  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalSettings, setOriginalSettings] = useState<HeroImageSettings>(heroSettings);

  useEffect(() => {
    // Load current settings - in a real app, this would come from Supabase
    const savedSettings = localStorage.getItem('heroImageSettings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setHeroSettings(parsed);
      setOriginalSettings(parsed);
    }
  }, []);

  useEffect(() => {
    // Check if there are unsaved changes
    const hasUnsavedChanges = JSON.stringify(heroSettings) !== JSON.stringify(originalSettings);
    setHasChanges(hasUnsavedChanges);
  }, [heroSettings, originalSettings]);

  const handleImageUpload = async (file: File, previewUrl: string) => {
    try {
      // In a real implementation, you would upload to Supabase Storage here
      // For now, we'll use the local preview URL
      console.log('Uploading file:', file.name);
      
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setHeroSettings(prev => ({
        ...prev,
        url: previewUrl
      }));
      
      toast.success('Image uploadée avec succès!');
    } catch (error) {
      console.error('Upload error:', error);
      throw new Error('Erreur lors de l\'upload');
    }
  };

  const handleImageRemove = () => {
    setHeroSettings(prev => ({
      ...prev,
      url: ""
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // In a real app, save to Supabase here
      localStorage.setItem('heroImageSettings', JSON.stringify(heroSettings));
      setOriginalSettings(heroSettings);
      
      // Update the actual component - in a real app, this would trigger a refetch
      await new Promise(resolve => setTimeout(resolve, 500));
      
      toast.success('Paramètres sauvegardés avec succès!');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setHeroSettings(originalSettings);
    toast.info('Modifications annulées');
  };

  const previewInNewTab = () => {
    window.open('/', '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-stone-800">
            Image Principale
          </h2>
          <p className="text-stone-600">
            Gérez l'image héro de votre page d'accueil
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={previewInNewTab}
          >
            <Eye className="h-4 w-4 mr-2" />
            Prévisualiser
          </Button>
          
          {hasChanges && (
            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
              Modifications non sauvegardées
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Image Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ImageIcon className="h-5 w-5 text-olive-600" />
              <span>Image Héro</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ImageUpload
              currentImage={heroSettings.url}
              onImageUpload={handleImageUpload}
              onImageRemove={handleImageRemove}
              title="Modifier l'image principale"
              description="Uploadez une nouvelle image pour la section héro de votre site"
              aspectRatio={4/5}
              maxSizeMB={10}
            />
            
            <div className="text-xs text-stone-500 bg-stone-50 p-3 rounded-lg">
              <strong>Recommandations:</strong>
              <ul className="mt-1 space-y-1">
                <li>• Résolution optimale: 800x1000px (ratio 4:5)</li>
                <li>• Format: JPG, PNG ou WebP</li>
                <li>• Taille maximum: 10MB</li>
                <li>• L'image doit être claire et représentative de vos produits</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Settings Section */}
        <Card>
          <CardHeader>
            <CardTitle>Informations de l'image</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="alt">Texte alternatif (SEO)</Label>
              <Input
                id="alt"
                value={heroSettings.alt}
                onChange={(e) => setHeroSettings(prev => ({ ...prev, alt: e.target.value }))}
                placeholder="Description de l'image pour l'accessibilité"
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="title">Titre de l'overlay</Label>
              <Input
                id="title"
                value={heroSettings.title}
                onChange={(e) => setHeroSettings(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Titre affiché sur l'image"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subtitle">Sous-titre</Label>
              <Input
                id="subtitle"
                value={heroSettings.subtitle}
                onChange={(e) => setHeroSettings(prev => ({ ...prev, subtitle: e.target.value }))}
                placeholder="Sous-titre affiché sur l'image"
              />
            </div>

            <Separator />

            {/* Preview Section */}
            <div className="space-y-2">
              <Label>Aperçu de l'overlay</Label>
              <div className="relative bg-stone-100 rounded-lg p-4 border">
                <div className="bg-white/95 backdrop-blur-sm px-4 py-3 rounded-lg shadow-sm">
                  <p className="text-sm font-medium text-stone-800 mb-1">
                    {heroSettings.title || "Titre manquant"}
                  </p>
                  <p className="text-xs text-stone-600">
                    {heroSettings.subtitle || "Sous-titre manquant"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center space-x-2 text-sm text-stone-600">
          <Monitor className="h-4 w-4" />
          <span>Les modifications seront visibles sur la page d'accueil</span>
        </div>
        
        <div className="flex items-center space-x-2">
          {hasChanges && (
            <Button 
              variant="outline" 
              onClick={handleReset}
              disabled={isSaving}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Annuler
            </Button>
          )}
          
          <Button 
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="bg-olive-700 hover:bg-olive-800"
          >
            {isSaving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Sauvegarder
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminHeroImageManager;