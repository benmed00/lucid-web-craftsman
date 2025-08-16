import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit2, Package, AlertTriangle, TrendingUp, TrendingDown, Search, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Product {
  id: number;
  name: string;
  category: string;
  stock_quantity: number;
  min_stock_level: number;
  is_available: boolean;
  price: number;
  images: string[];
}

interface StockUpdate {
  productId: number;
  newQuantity: number;
  minLevel: number;
  isAvailable: boolean;
}

const AdminInventory = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch products data
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['admin-inventory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, category, stock_quantity, min_stock_level, is_available, price, images')
        .order('name');
      
      if (error) throw error;
      return data as Product[];
    }
  });

  // Get unique categories
  const categories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category))];
    return cats.sort();
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.category.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
      
      let matchesStock = true;
      if (stockFilter === 'low') {
        matchesStock = product.stock_quantity <= product.min_stock_level;
      } else if (stockFilter === 'out') {
        matchesStock = product.stock_quantity === 0;
      } else if (stockFilter === 'available') {
        matchesStock = product.stock_quantity > 0;
      }
      
      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, searchTerm, categoryFilter, stockFilter]);

  // Calculate inventory stats
  const inventoryStats = useMemo(() => {
    const totalProducts = products.length;
    const lowStock = products.filter(p => p.stock_quantity <= p.min_stock_level && p.stock_quantity > 0).length;
    const outOfStock = products.filter(p => p.stock_quantity === 0).length;
    const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock_quantity), 0);
    
    return { totalProducts, lowStock, outOfStock, totalValue };
  }, [products]);

  const handleUpdateStock = async (updates: StockUpdate) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({
          stock_quantity: updates.newQuantity,
          min_stock_level: updates.minLevel,
          is_available: updates.isAvailable
        })
        .eq('id', updates.productId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setEditDialogOpen(false);
      toast.success('Stock mis à jour avec succès');
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error('Erreur lors de la mise à jour du stock');
    }
  };

  const getStockStatusBadge = (product: Product) => {
    if (product.stock_quantity === 0) {
      return <Badge variant="destructive">Rupture de stock</Badge>;
    }
    if (product.stock_quantity <= product.min_stock_level) {
      return <Badge variant="outline" className="text-amber-600 border-amber-300">Stock faible</Badge>;
    }
    return <Badge variant="outline" className="text-green-600 border-green-300">En stock</Badge>;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Chargement de l'inventaire...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif text-stone-800 mb-2">Gestion de l'Inventaire</h1>
        <p className="text-stone-600">Suivez et gérez le stock de vos produits</p>
      </div>

      {/* Inventory Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-stone-600">Total Produits</p>
                <p className="text-2xl font-bold text-stone-900">{inventoryStats.totalProducts}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-stone-600">Stock Faible</p>
                <p className="text-2xl font-bold text-amber-600">{inventoryStats.lowStock}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-stone-600">Rupture de Stock</p>
                <p className="text-2xl font-bold text-red-600">{inventoryStats.outOfStock}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-stone-600">Valeur Stock</p>
                <p className="text-2xl font-bold text-green-600">{inventoryStats.totalValue.toFixed(2)} €</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Recherche</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400 h-4 w-4" />
                <Input
                  id="search"
                  placeholder="Nom du produit, catégorie..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="category">Catégorie</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les catégories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="stock">Statut Stock</Label>
              <Select value={stockFilter} onValueChange={setStockFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="available">En stock</SelectItem>
                  <SelectItem value="low">Stock faible</SelectItem>
                  <SelectItem value="out">Rupture de stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inventaire Produits ({filteredProducts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produit</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Stock Actuel</TableHead>
                  <TableHead>Stock Min</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Prix Unitaire</TableHead>
                  <TableHead>Valeur Stock</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-stone-100 rounded-lg overflow-hidden flex-shrink-0">
                          <img
                            src={product.images[0] || '/placeholder.svg'}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-medium text-stone-900">{product.name}</p>
                          {!product.is_available && (
                            <Badge variant="secondary" className="text-xs">Non disponible</Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell className="font-mono">{product.stock_quantity}</TableCell>
                    <TableCell className="font-mono">{product.min_stock_level}</TableCell>
                    <TableCell>{getStockStatusBadge(product)}</TableCell>
                    <TableCell>{product.price.toFixed(2)} €</TableCell>
                    <TableCell>{(product.price * product.stock_quantity).toFixed(2)} €</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedProduct(product);
                          setEditDialogOpen(true);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Stock Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le Stock</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <EditStockForm
              product={selectedProduct}
              onUpdate={handleUpdateStock}
              onCancel={() => setEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Edit Stock Form Component
interface EditStockFormProps {
  product: Product;
  onUpdate: (updates: StockUpdate) => void;
  onCancel: () => void;
}

const EditStockForm: React.FC<EditStockFormProps> = ({ product, onUpdate, onCancel }) => {
  const [stockQuantity, setStockQuantity] = useState(product.stock_quantity.toString());
  const [minLevel, setMinLevel] = useState(product.min_stock_level.toString());
  const [isAvailable, setIsAvailable] = useState(product.is_available);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newQuantity = parseInt(stockQuantity);
    const newMinLevel = parseInt(minLevel);
    
    if (isNaN(newQuantity) || isNaN(newMinLevel) || newQuantity < 0 || newMinLevel < 0) {
      toast.error('Veuillez entrer des valeurs valides');
      return;
    }

    onUpdate({
      productId: product.id,
      newQuantity,
      minLevel: newMinLevel,
      isAvailable
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="stock-quantity">Stock Actuel</Label>
        <Input
          id="stock-quantity"
          type="number"
          min="0"
          value={stockQuantity}
          onChange={(e) => setStockQuantity(e.target.value)}
          placeholder="Quantité en stock"
        />
      </div>

      <div>
        <Label htmlFor="min-level">Stock Minimum</Label>
        <Input
          id="min-level"
          type="number"
          min="0"
          value={minLevel}
          onChange={(e) => setMinLevel(e.target.value)}
          placeholder="Niveau minimum"
        />
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="is-available"
          checked={isAvailable}
          onChange={(e) => setIsAvailable(e.target.checked)}
          className="rounded border-stone-300"
        />
        <Label htmlFor="is-available">Produit disponible à la vente</Label>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" className="flex-1">
          Sauvegarder
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </form>
  );
};

export default AdminInventory;