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
      artisan: product.artisan,
      artisan_story: product.artisan_story
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

        <div className="flex items-center space-x-2">
          <Switch
            id="new"
            checked={formData.is_new || false}
            onCheckedChange={(checked) => setFormData({...formData, is_new: checked})}
          />
          <Label htmlFor="new">Marquer comme nouveau</Label>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
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
          
          <ProductForm />
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              className="bg-olive-700 hover:bg-olive-800"
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