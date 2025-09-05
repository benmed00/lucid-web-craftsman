import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Save, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ProductImageManager } from "./ProductImageManager";

interface ProductFormData {
  name: string;
  price: string;
  category: string;
  description: string;
  details: string;
  care: string;
  artisan: string;
  artisan_story: string;
  short_description: string;
  material: string;
  color: string;
  dimensions_cm: string;
  weight_grams: string;
  stock_quantity: string;
  min_stock_level: string;
  is_featured: boolean;
  is_new: boolean;
  is_active: boolean;
  seo_title: string;
  seo_description: string;
  images: string[];
}

interface ProductFormWithImagesProps {
  onProductAdded: () => void;
}

const categories = [
  "Chapeaux",
  "Sacs",
  "Paniers", 
  "Accessoires",
  "Décoration",
  "Autres"
];

export const ProductFormWithImages = ({ onProductAdded }: ProductFormWithImagesProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    price: "",
    category: "",
    description: "",
    details: "",
    care: "",
    artisan: "",
    artisan_story: "",
    short_description: "",
    material: "",
    color: "",
    dimensions_cm: "",
    weight_grams: "",
    stock_quantity: "0",
    min_stock_level: "5",
    is_featured: false,
    is_new: true,
    is_active: true,
    seo_title: "",
    seo_description: "",
    images: []
  });

  const handleInputChange = (field: keyof ProductFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImagesChange = (images: string[]) => {
    setFormData(prev => ({ ...prev, images }));
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const slug = generateSlug(formData.name);
      
      const productData = {
        name: formData.name,
        price: parseFloat(formData.price),
        category: formData.category,
        description: formData.description,
        details: formData.details,
        care: formData.care,
        artisan: formData.artisan,
        artisan_story: formData.artisan_story,
        short_description: formData.short_description,
        material: formData.material,
        color: formData.color,
        dimensions_cm: formData.dimensions_cm,
        weight_grams: formData.weight_grams ? parseInt(formData.weight_grams) : null,
        stock_quantity: parseInt(formData.stock_quantity),
        min_stock_level: parseInt(formData.min_stock_level),
        is_featured: formData.is_featured,
        is_new: formData.is_new,
        is_active: formData.is_active,
        seo_title: formData.seo_title || formData.name,
        seo_description: formData.seo_description || formData.short_description,
        slug: slug,
        images: formData.images
      };

      const { error } = await supabase
        .from('products')
        .insert(productData);

      if (error) throw error;

      toast.success("Produit créé avec succès");
      
      // Reset form
      setFormData({
        name: "",
        price: "",
        category: "",
        description: "",
        details: "",
        care: "",
        artisan: "",
        artisan_story: "",
        short_description: "",
        material: "",
        color: "",
        dimensions_cm: "",
        weight_grams: "",
        stock_quantity: "0",
        min_stock_level: "5",
        is_featured: false,
        is_new: true,
        is_active: true,
        seo_title: "",
        seo_description: "",
        images: []
      });
      
      setOpen(false);
      onProductAdded();
    } catch (error: any) {
      console.error('Error creating product:', error);
      toast.error(`Erreur lors de la création du produit: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nouveau produit
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-5xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b flex-shrink-0 bg-background">
          <DialogTitle>Créer un nouveau produit</DialogTitle>
          <DialogDescription>
            Ajoutez un nouveau produit avec ses images et informations détaillées.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informations de base</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom du produit *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Prix (€) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => handleInputChange("price", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Catégorie *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => handleInputChange("category", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="artisan">Artisan *</Label>
                  <Input
                    id="artisan"
                    value={formData.artisan}
                    onChange={(e) => handleInputChange("artisan", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="short_description">Description courte</Label>
                <Textarea
                  id="short_description"
                  value={formData.short_description}
                  onChange={(e) => handleInputChange("short_description", e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  rows={4}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Images */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Images du produit</CardTitle>
            </CardHeader>
            <CardContent>
              <ProductImageManager
                images={formData.images}
                onImagesChange={handleImagesChange}
                maxImages={5}
              />
            </CardContent>
          </Card>

          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Détails et spécifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="material">Matériau</Label>
                  <Input
                    id="material"
                    value={formData.material}
                    onChange={(e) => handleInputChange("material", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="color">Couleur</Label>
                  <Input
                    id="color"
                    value={formData.color}
                    onChange={(e) => handleInputChange("color", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dimensions_cm">Dimensions (cm)</Label>
                  <Input
                    id="dimensions_cm"
                    value={formData.dimensions_cm}
                    onChange={(e) => handleInputChange("dimensions_cm", e.target.value)}
                    placeholder="L x l x H"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weight_grams">Poids (g)</Label>
                  <Input
                    id="weight_grams"
                    type="number"
                    value={formData.weight_grams}
                    onChange={(e) => handleInputChange("weight_grams", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stock_quantity">Stock actuel</Label>
                  <Input
                    id="stock_quantity"
                    type="number"
                    min="0"
                    value={formData.stock_quantity}
                    onChange={(e) => handleInputChange("stock_quantity", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="min_stock_level">Stock minimum</Label>
                  <Input
                    id="min_stock_level"
                    type="number"
                    min="0"
                    value={formData.min_stock_level}
                    onChange={(e) => handleInputChange("min_stock_level", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="details">Détails *</Label>
                <Textarea
                  id="details"
                  value={formData.details}
                  onChange={(e) => handleInputChange("details", e.target.value)}
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="care">Instructions d'entretien *</Label>
                <Textarea
                  id="care"
                  value={formData.care}
                  onChange={(e) => handleInputChange("care", e.target.value)}
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="artisan_story">Histoire de l'artisan</Label>
                <Textarea
                  id="artisan_story"
                  value={formData.artisan_story}
                  onChange={(e) => handleInputChange("artisan_story", e.target.value)}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* SEO & Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">SEO et paramètres</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="seo_title">Titre SEO</Label>
                  <Input
                    id="seo_title"
                    value={formData.seo_title}
                    onChange={(e) => handleInputChange("seo_title", e.target.value)}
                    placeholder="Sera généré automatiquement si vide"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="seo_description">Description SEO</Label>
                  <Textarea
                    id="seo_description"
                    value={formData.seo_description}
                    onChange={(e) => handleInputChange("seo_description", e.target.value)}
                    rows={2}
                    placeholder="Sera générée automatiquement si vide"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-6">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_featured"
                    checked={formData.is_featured}
                    onCheckedChange={(checked) => handleInputChange("is_featured", checked)}
                  />
                  <Label htmlFor="is_featured">Produit vedette</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_new"
                    checked={formData.is_new}
                    onCheckedChange={(checked) => handleInputChange("is_new", checked)}
                  />
                  <Label htmlFor="is_new">Nouveau produit</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => handleInputChange("is_active", checked)}
                  />
                  <Label htmlFor="is_active">Actif</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          </form>
        </div>

        <div className="flex justify-end space-x-2 p-6 pt-4 border-t bg-background flex-shrink-0">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button 
            type="submit" 
            disabled={loading} 
            className="gap-2 bg-olive-700 hover:bg-olive-800"
            onClick={handleSubmit}
          >
            <Save className="h-4 w-4" />
            {loading ? "Création..." : "Créer le produit"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};