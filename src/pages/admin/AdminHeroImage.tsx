import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from 'sonner';
import ImageUpload from '@/components/ui/ImageUpload';
import { Eye, Save, RotateCcw, ImageIcon, Monitor } from 'lucide-react';
import { useHeroImage } from '@/hooks/useHeroImage';
import { HeroImageData } from '@/services/heroImageService';

const AdminHeroImage = () => {
  const { heroImageData, updateHeroImage, uploadImage, isLoading: heroLoading } = useHeroImage();
  const [localData, setLocalData] = useState<HeroImageData>(heroImageData);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Update local data when hero image data changes
  useEffect(() => {
    setLocalData(heroImageData);
  }, [heroImageData]);

  const hasChanges = JSON.stringify(localData) !== JSON.stringify(heroImageData);

  const handleImageUpload = async (file: File, previewUrl: string) => {
    setIsUploading(true);
    try {
      // Upload to Supabase Storage
      const uploadedUrl = await uploadImage(file);
      
      setLocalData(prev => ({
        ...prev,
        imageUrl: uploadedUrl
      }));
      
      toast.success('Image uploadée avec succès!');
    } catch (error) {
      toast.error('Erreur lors de l\'upload de l\'image');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateHeroImage(localData);
      toast.success('Image principale mise à jour avec succès!');
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setLocalData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleReset = () => {
    setLocalData(heroImageData);
    toast.success('Modifications annulées');
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
              currentImage={localData.imageUrl}
              onImageUpload={handleImageUpload}
              title="Image Principale du Site"
              description="Téléchargez une nouvelle image pour la page d'accueil"
              className="w-full"
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
              <Label htmlFor="altText">Texte alternatif (SEO)</Label>
              <Input
                id="altText"
                value={localData.altText}
                onChange={(e) => handleInputChange('altText', e.target.value)}
                placeholder="Description alternative de l'image"
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="title">Titre</Label>
              <Input
                id="title"
                value={localData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Titre principal affiché sur l'image"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subtitle">Sous-titre</Label>
              <Textarea
                id="subtitle"
                value={localData.subtitle}
                onChange={(e) => handleInputChange('subtitle', e.target.value)}
                placeholder="Sous-titre ou description courte"
                rows={3}
              />
            </div>

            <Separator />

            {/* Preview Section */}
            <div className="space-y-2">
              <Label>Aperçu en temps réel</Label>
              <div className="relative aspect-[4/5] bg-stone-100 rounded-lg overflow-hidden border">
                <img 
                  src={localData.imageUrl} 
                  alt={localData.altText}
                  className="w-full h-full object-cover rounded-lg"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent rounded-lg" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="bg-white/95 backdrop-blur-sm px-4 py-3 rounded-lg shadow-lg">
                    <p className="text-sm font-medium text-stone-800 mb-1">
                      {localData.title}
                    </p>
                    <p className="text-xs text-stone-600">
                      {localData.subtitle}
                    </p>
                  </div>
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
              <RotateCcw className="h-4 w-4 mr-2" />
              Annuler
            </Button>
          )}
          
          <Button 
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="bg-primary hover:bg-primary/90"
          >
            {isSaving ? (
              <>
                <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
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

export default AdminHeroImage;