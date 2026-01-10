import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Package, 
  Search, 
  FileText, 
  Ruler, 
  Palette, 
  Scale, 
  User, 
  Heart,
  Tag,
  Box,
  Info,
  Sparkles,
  ShoppingBag,
  Star,
  Clock,
  Download,
  Printer,
  ExternalLink
} from "lucide-react";
import { ProductService } from "@/services/productService";
import { Product } from "@/shared/interfaces/Iproduct.interface";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const AdminProductCatalog = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await ProductService.getAllProducts();
      setProducts(data);
      if (data.length > 0) {
        setSelectedProduct(data[0]);
      }
    } catch (error) {
      console.error("Error loading products:", error);
      toast.error("Erreur lors du chargement des produits");
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.artisan?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exportCatalog = () => {
    const catalogData = products.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: `${p.price}€`,
      artisan: p.artisan,
      material: p.material || 'Non spécifié',
      color: p.color || 'Non spécifié',
      dimensions: p.dimensions_cm || 'Non spécifié',
      weight: p.weight_grams ? `${p.weight_grams}g` : 'Non spécifié',
      stock: p.stock_quantity || 0,
      description: p.description,
      details: p.details,
      care: p.care,
      artisan_story: p.artisan_story || '',
      is_active: p.is_active,
      is_new: p.is_new,
      is_featured: p.is_featured
    }));

    const blob = new Blob([JSON.stringify(catalogData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `catalogue-produits-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Catalogue exporté avec succès");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-serif font-semibold text-foreground">
            Catalogue Produits Complet
          </h2>
          <p className="text-muted-foreground">
            Documentation détaillée de {products.length} produits
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCatalog}>
            <Download className="h-4 w-4 mr-2" />
            Exporter JSON
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimer
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{products.length}</p>
              <p className="text-xs text-muted-foreground">Total produits</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Sparkles className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{products.filter(p => p.is_new).length}</p>
              <p className="text-xs text-muted-foreground">Nouveautés</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Star className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{products.filter(p => p.is_featured).length}</p>
              <p className="text-xs text-muted-foreground">En vedette</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <ShoppingBag className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{new Set(products.map(p => p.category)).size}</p>
              <p className="text-xs text-muted-foreground">Catégories</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Liste des produits</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <div className="space-y-1 p-2">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => setSelectedProduct(product)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedProduct?.id === product.id
                        ? 'bg-primary/10 border border-primary/20'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={product.images?.[0] || "/placeholder.svg"}
                        alt={product.name}
                        className="w-12 h-12 rounded-md object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{product.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {product.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{product.price}€</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Product Details */}
        <Card className="lg:col-span-2">
          {selectedProduct ? (
            <>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge>{selectedProduct.category}</Badge>
                      {selectedProduct.is_new && <Badge variant="secondary">Nouveau</Badge>}
                      {selectedProduct.is_featured && <Badge className="bg-yellow-500">Vedette</Badge>}
                      {!selectedProduct.is_active && <Badge variant="destructive">Inactif</Badge>}
                    </div>
                    <CardTitle className="text-xl">{selectedProduct.name}</CardTitle>
                    <CardDescription className="text-lg font-semibold text-primary mt-1">
                      {selectedProduct.price}€
                    </CardDescription>
                  </div>
                  <Link to={`/products/${selectedProduct.id}`} target="_blank">
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Voir
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              
              <CardContent>
                <Tabs defaultValue="description" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="description">Description</TabsTrigger>
                    <TabsTrigger value="specs">Spécifications</TabsTrigger>
                    <TabsTrigger value="artisan">Artisan</TabsTrigger>
                    <TabsTrigger value="seo">SEO & Stock</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="description" className="mt-4 space-y-4">
                    {/* Images Gallery */}
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Box className="h-4 w-4" />
                        Images ({selectedProduct.images?.length || 0})
                      </h4>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {selectedProduct.images?.map((img, idx) => (
                          <img
                            key={idx}
                            src={img}
                            alt={`${selectedProduct.name} - ${idx + 1}`}
                            className="w-24 h-24 rounded-lg object-cover flex-shrink-0 border"
                          />
                        )) || <p className="text-muted-foreground text-sm">Aucune image</p>}
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Description
                      </h4>
                      <p className="text-muted-foreground leading-relaxed">
                        {selectedProduct.description || "Aucune description disponible"}
                      </p>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        Détails techniques
                      </h4>
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                        {selectedProduct.details || "Aucun détail technique disponible"}
                      </p>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Heart className="h-4 w-4" />
                        Instructions d'entretien
                      </h4>
                      <p className="text-muted-foreground leading-relaxed">
                        {selectedProduct.care || "Aucune instruction d'entretien disponible"}
                      </p>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="specs" className="mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-muted rounded-lg">
                              <Palette className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Matériau</p>
                              <p className="font-medium">{selectedProduct.material || "Non spécifié"}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-muted rounded-lg">
                              <Tag className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Couleur</p>
                              <p className="font-medium">{selectedProduct.color || "Non spécifié"}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-muted rounded-lg">
                              <Ruler className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Dimensions</p>
                              <p className="font-medium">{selectedProduct.dimensions_cm || "Non spécifié"}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-muted rounded-lg">
                              <Scale className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Poids</p>
                              <p className="font-medium">
                                {selectedProduct.weight_grams ? `${selectedProduct.weight_grams}g` : "Non spécifié"}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <Separator className="my-4" />
                    
                    <div>
                      <h4 className="font-medium mb-3">Informations produit</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-muted-foreground">ID Produit</span>
                          <span className="font-mono">{selectedProduct.id}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-muted-foreground">Catégorie</span>
                          <span>{selectedProduct.category}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-muted-foreground">Slug</span>
                          <span className="font-mono text-xs">{selectedProduct.slug || "Non défini"}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-muted-foreground">Créé le</span>
                          <span>{selectedProduct.created_at ? new Date(selectedProduct.created_at).toLocaleDateString('fr-FR') : "N/A"}</span>
                        </div>
                        <div className="flex justify-between py-2">
                          <span className="text-muted-foreground">Mis à jour le</span>
                          <span>{selectedProduct.updated_at ? new Date(selectedProduct.updated_at).toLocaleDateString('fr-FR') : "N/A"}</span>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="artisan" className="mt-4 space-y-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-primary/10 rounded-full">
                            <User className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Artisan</p>
                            <p className="font-semibold text-lg">{selectedProduct.artisan}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Heart className="h-4 w-4" />
                        Histoire de l'artisan
                      </h4>
                      <div className="bg-muted/50 rounded-lg p-4">
                        <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                          {selectedProduct.artisan_story || "Aucune histoire d'artisan disponible. L'histoire de l'artisan permet de raconter le parcours, les techniques et la passion qui donnent vie à chaque création artisanale."}
                        </p>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="seo" className="mt-4 space-y-4">
                    {/* Stock Info */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Box className="h-4 w-4" />
                          Inventaire
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 bg-muted rounded-lg">
                            <p className="text-2xl font-bold">{selectedProduct.stock_quantity ?? 0}</p>
                            <p className="text-xs text-muted-foreground">En stock</p>
                          </div>
                          <div className="text-center p-3 bg-muted rounded-lg">
                            <p className="text-2xl font-bold">{selectedProduct.min_stock_level ?? 5}</p>
                            <p className="text-xs text-muted-foreground">Stock minimum</p>
                          </div>
                        </div>
                        {(selectedProduct.stock_quantity ?? 0) <= (selectedProduct.min_stock_level ?? 5) && (
                          <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-center">
                            <p className="text-yellow-600 text-sm font-medium">⚠️ Stock bas - Réapprovisionnement recommandé</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    
                    {/* SEO Info */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Métadonnées SEO
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Titre SEO</p>
                          <p className="text-sm p-2 bg-muted rounded">
                            {selectedProduct.seo_title || selectedProduct.name}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Description SEO</p>
                          <p className="text-sm p-2 bg-muted rounded">
                            {selectedProduct.seo_description || selectedProduct.short_description || "Non définie"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Description courte</p>
                          <p className="text-sm p-2 bg-muted rounded">
                            {selectedProduct.short_description || "Non définie"}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Rating */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Star className="h-4 w-4" />
                          Évaluations
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className="text-3xl font-bold">
                              {selectedProduct.rating_average?.toFixed(1) ?? "—"}
                            </p>
                            <p className="text-xs text-muted-foreground">Note moyenne</p>
                          </div>
                          <Separator orientation="vertical" className="h-12" />
                          <div className="text-center">
                            <p className="text-3xl font-bold">
                              {selectedProduct.rating_count ?? 0}
                            </p>
                            <p className="text-xs text-muted-foreground">Nombre d'avis</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-[600px]">
              <p className="text-muted-foreground">Sélectionnez un produit pour voir les détails</p>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Full Catalog Print View */}
      <Card className="print:block hidden">
        <CardHeader>
          <CardTitle>Catalogue complet - DOUAR Market</CardTitle>
          <CardDescription>Généré le {new Date().toLocaleDateString('fr-FR')}</CardDescription>
        </CardHeader>
        <CardContent>
          {products.map((product) => (
            <div key={product.id} className="mb-8 pb-8 border-b last:border-0">
              <h3 className="text-lg font-bold">{product.name}</h3>
              <p className="text-sm text-muted-foreground">ID: {product.id} | {product.category} | {product.price}€</p>
              <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Artisan:</strong> {product.artisan}<br/>
                  <strong>Matériau:</strong> {product.material || "N/A"}<br/>
                  <strong>Couleur:</strong> {product.color || "N/A"}<br/>
                  <strong>Dimensions:</strong> {product.dimensions_cm || "N/A"}
                </div>
                <div>
                  <strong>Stock:</strong> {product.stock_quantity ?? 0}<br/>
                  <strong>Poids:</strong> {product.weight_grams ? `${product.weight_grams}g` : "N/A"}<br/>
                  <strong>Statut:</strong> {product.is_active ? "Actif" : "Inactif"}
                </div>
              </div>
              <div className="mt-2">
                <strong>Description:</strong>
                <p className="text-sm">{product.description}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminProductCatalog;
