import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Package, 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  Filter,
  Eye,
  EyeOff,
  ImageIcon,
  RefreshCw
} from "lucide-react";
import { ProductImageManager } from "@/components/admin/ProductImageManager";
import { ProductFormWithImages } from "@/components/admin/ProductFormWithImages";
import { ProductService } from "@/services/productService";
import { Product } from "@/shared/interfaces/Iproduct.interface";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useAuditLog } from "@/hooks/useAuditLog";
import { supabase } from "@/integrations/supabase/client";

const AdminProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const { logAction } = useAuditLog();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [categories] = useState<string[]>(["Sacs", "Chapeaux"]);
  const [formData, setFormData] = useState<Partial<Product>>({});

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await ProductService.getAllProducts();
      setProducts(data);
    } catch (error) {
      console.error("Error loading products:", error);
      toast.error("Erreur lors du chargement des produits");
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.artisan?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "all" || product.category.toLowerCase() === filterCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price,
      images: product.images,
      category: product.category,
      description: product.description,
      details: product.details,
      care: product.care,
      is_new: product.is_new,
      is_featured: product.is_featured,
      is_active: product.is_active,
      artisan: product.artisan,
      artisan_story: product.artisan_story,
      material: product.material,
      color: product.color,
      dimensions_cm: product.dimensions_cm,
      weight_grams: product.weight_grams,
      stock_quantity: product.stock_quantity,
      min_stock_level: product.min_stock_level,
      short_description: product.short_description,
      seo_title: product.seo_title,
      seo_description: product.seo_description,
      slug: product.slug
    });
    setIsNewProduct(false);
    setIsDialogOpen(true);
  };

  const handleNewProduct = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      price: 0,
      images: [],
      category: "Sacs",
      description: "",
      details: "",
      care: "",
      is_new: false,
      artisan: "",
      artisan_story: ""
    });
    setIsNewProduct(true);
    setIsDialogOpen(true);
  };

  const handleSaveProduct = async () => {
    try {
      if (!formData.name || !formData.price || !formData.category) {
        toast.error("Veuillez remplir tous les champs obligatoires");
        return;
      }

      const productData = {
        ...formData,
        images: formData.images || []
      };

      if (isNewProduct) {
        // This shouldn't happen as we use ProductFormWithImages for new products
        toast.info("Utilisez le bouton 'Ajouter un produit' pour créer de nouveaux produits");
        return;
      } else {
        // Update existing product
        const { data, error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct?.id)
          .select()
          .single();

        if (error) throw error;

        // Update local state
        setProducts(prev => prev.map(p => p.id === editingProduct?.id ? data : p));
        
        toast.success("Produit modifié avec succès");
        logAction('UPDATE_PRODUCT', 'products', editingProduct?.id?.toString() || '');
      }

      setIsDialogOpen(false);
      setFormData({});
      setEditingProduct(null);
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error("Erreur lors de la sauvegarde du produit");
    }
  };

  const ProductForm = () => {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom du produit</Label>
            <Input
              id="name"
              value={formData.name || ""}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Nom du produit"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Prix (€)</Label>
            <Input
              id="price"
              type="number"
              value={formData.price || 0}
              onChange={(e) => setFormData({...formData, price: Number(e.target.value)})}
              placeholder="Prix"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="category">Catégorie</Label>
            <Select 
              value={formData.category || "Sacs"} 
              onValueChange={(value) => setFormData({...formData, category: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Sacs">Sacs</SelectItem>
                <SelectItem value="Chapeaux">Chapeaux</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="artisan">Artisan</Label>
            <Input
              id="artisan"
              value={formData.artisan || ""}
              onChange={(e) => setFormData({...formData, artisan: e.target.value})}
              placeholder="Nom de l'artisan"
            />
          </div>
        </div>

        {/* Images Section */}
        <div className="space-y-2">
          <Label>Images du produit</Label>
          <ProductImageManager
            images={formData.images || []}
            onImagesChange={(images) => setFormData({...formData, images})}
            productId={editingProduct?.id}
            maxImages={5}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description || ""}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            placeholder="Description du produit"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="details">Détails techniques</Label>
          <Textarea
            id="details"
            value={formData.details || ""}
            onChange={(e) => setFormData({...formData, details: e.target.value})}
            placeholder="Dimensions, matériaux, etc."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="care">Instructions d'entretien</Label>
          <Textarea
            id="care"
            value={formData.care || ""}
            onChange={(e) => setFormData({...formData, care: e.target.value})}
            placeholder="Instructions d'entretien"
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="artisan_story">Histoire de l'artisan</Label>
          <Textarea
            id="artisan_story"
            value={formData.artisan_story || ""}
            onChange={(e) => setFormData({...formData, artisan_story: e.target.value})}
            placeholder="L'histoire derrière la création..."
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="material">Matériau</Label>
            <Input
              id="material"
              value={formData.material || ""}
              onChange={(e) => setFormData({...formData, material: e.target.value})}
              placeholder="Matériau principal"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Couleur</Label>
            <Input
              id="color"
              value={formData.color || ""}
              onChange={(e) => setFormData({...formData, color: e.target.value})}
              placeholder="Couleur principale"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="dimensions">Dimensions (cm)</Label>
            <Input
              id="dimensions"
              value={formData.dimensions_cm || ""}
              onChange={(e) => setFormData({...formData, dimensions_cm: e.target.value})}
              placeholder="L x l x H"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="weight">Poids (g)</Label>
            <Input
              id="weight"
              type="number"
              value={formData.weight_grams || 0}
              onChange={(e) => setFormData({...formData, weight_grams: Number(e.target.value)})}
              placeholder="Poids en grammes"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="stock">Stock</Label>
            <Input
              id="stock"
              type="number"
              value={formData.stock_quantity || 0}
              onChange={(e) => setFormData({...formData, stock_quantity: Number(e.target.value)})}
              placeholder="Quantité en stock"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="min_stock">Stock minimum</Label>
            <Input
              id="min_stock"
              type="number"
              value={formData.min_stock_level || 5}
              onChange={(e) => setFormData({...formData, min_stock_level: Number(e.target.value)})}
              placeholder="Niveau de stock minimum"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col space-y-3">
            <div className="flex items-center space-x-2">
              <Switch
                id="new"
                checked={formData.is_new || false}
                onCheckedChange={(checked) => setFormData({...formData, is_new: checked})}
              />
              <Label htmlFor="new">Marquer comme nouveau</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="featured"
                checked={formData.is_featured || false}
                onCheckedChange={(checked) => setFormData({...formData, is_featured: checked})}
              />
              <Label htmlFor="featured">Produit en vedette</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.is_active !== false}
                onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
              />
              <Label htmlFor="active">Produit actif</Label>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Chargement des produits...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-serif font-semibold text-stone-800">
            Gestion des produits
          </h2>
          <p className="text-stone-600">
            {products.length} produits dans votre catalogue
          </p>
        </div>
        
        <div className="flex space-x-2">
          <ProductFormWithImages onProductAdded={fetchProducts} />
          <Link to="/admin/hero-image">
            <Button variant="outline" size="sm">
              <ImageIcon className="h-4 w-4 mr-2" />
              Gérer l'image principale
            </Button>
          </Link>
          <Button onClick={fetchProducts} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                <Input
                  placeholder="Rechercher par nom ou artisan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes catégories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category.toLowerCase()}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="group hover:shadow-lg transition-shadow">
            <CardHeader className="p-0">
              <div className="relative h-48 overflow-hidden rounded-t-lg">
                <img
                  src={product.images?.[0] || "/placeholder.svg"}
                  alt={product.name}
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  {product.is_new && (
                    <Badge className="bg-olive-700 text-white">Nouveau</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-stone-800 line-clamp-2">
                      {product.name}
                    </h3>
                    <p className="text-sm text-stone-600">{product.artisan}</p>
                  </div>
                  <p className="font-semibold text-olive-700">{product.price}€</p>
                </div>
                
                <Badge variant="outline" className="text-xs">
                  {product.category}
                </Badge>
                
                <p className="text-sm text-stone-600 line-clamp-2">
                  {product.description}
                </p>
              </div>
              
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditProduct(product)}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Modifier
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 text-stone-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-stone-800 mb-2">
              Aucun produit trouvé
            </h3>
            <p className="text-stone-600 mb-4">
              {searchQuery || filterCategory !== "all" 
                ? "Aucun produit ne correspond à vos critères de recherche."
                : "Commencez par ajouter votre premier produit."
              }
            </p>
            {(!searchQuery && filterCategory === "all") && (
              <ProductFormWithImages onProductAdded={fetchProducts} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit/Add Product Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden p-0">
          <DialogHeader className="p-6 pb-4 border-b bg-white sticky top-0 z-10">
            <DialogTitle>
              {isNewProduct ? "Ajouter un nouveau produit" : "Modifier le produit"}
            </DialogTitle>
            <DialogDescription>
              {isNewProduct 
                ? "Remplissez les informations pour créer un nouveau produit."
                : "Modifiez les informations du produit."
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[calc(85vh-140px)] p-6">
            <ProductForm />
          </div>
          
          <div className="flex justify-end space-x-2 p-6 pt-4 border-t bg-white sticky bottom-0 z-10">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              className="bg-olive-700 hover:bg-olive-800"
              onClick={handleSaveProduct}
            >
              {isNewProduct ? "Ajouter" : "Sauvegarder"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProducts;