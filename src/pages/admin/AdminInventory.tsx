import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Package, 
  AlertTriangle, 
  TrendingDown,
  Plus,
  Minus,
  Search,
  Filter,
  Truck,
  BarChart3,
  Archive,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";

// Mock inventory data - replace with Supabase data
const mockInventory = [
  {
    id: 1,
    productName: "Sac à Main Tissé Traditionnel",
    sku: "SAC-001",
    currentStock: 12,
    minStock: 5,
    maxStock: 25,
    cost: 35,
    sellPrice: 89,
    supplier: "Atelier Fatima",
    lastRestocked: "2024-01-10",
    status: "in_stock"
  },
  {
    id: 2,
    productName: "Chapeau de Paille Berbère",
    sku: "CHAP-001",
    currentStock: 3,
    minStock: 5,
    maxStock: 20,
    cost: 18,
    sellPrice: 45,
    supplier: "Atelier Hassan",
    lastRestocked: "2024-01-05",
    status: "low_stock"
  },
  {
    id: 3,
    productName: "Pochette Brodée à la Main",
    sku: "POCH-001",
    currentStock: 0,
    minStock: 3,
    maxStock: 15,
    cost: 25,
    sellPrice: 62,
    supplier: "Atelier Aisha",
    lastRestocked: "2023-12-20",
    status: "out_of_stock"
  },
  {
    id: 4,
    productName: "Cabas en Fibres Naturelles",
    sku: "CAB-001",
    currentStock: 8,
    minStock: 4,
    maxStock: 18,
    cost: 28,
    sellPrice: 75,
    supplier: "Atelier Omar",
    lastRestocked: "2024-01-12",
    status: "in_stock"
  }
];

const AdminInventory = () => {
  const [inventory, setInventory] = useState(mockInventory);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedItem, setSelectedItem] = useState<typeof mockInventory[0] | null>(null);
  const [stockAdjustment, setStockAdjustment] = useState({ type: "add", quantity: 0, reason: "" });

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = 
      item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || item.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in_stock": return "bg-green-100 text-green-800 border-green-200";
      case "low_stock": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "out_of_stock": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-stone-100 text-stone-800 border-stone-200";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "in_stock": return "En stock";
      case "low_stock": return "Stock faible";
      case "out_of_stock": return "Rupture";
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "in_stock": return <Package className="h-4 w-4" />;
      case "low_stock": return <AlertTriangle className="h-4 w-4" />;
      case "out_of_stock": return <TrendingDown className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const calculateMargin = (cost: number, sellPrice: number) => {
    return ((sellPrice - cost) / sellPrice * 100).toFixed(1);
  };

  const handleStockAdjustment = () => {
    if (!selectedItem || stockAdjustment.quantity <= 0) return;

    const newStock = stockAdjustment.type === "add" 
      ? selectedItem.currentStock + stockAdjustment.quantity
      : selectedItem.currentStock - stockAdjustment.quantity;

    if (newStock < 0) {
      toast.error("Le stock ne peut pas être négatif");
      return;
    }

    const newStatus = newStock === 0 ? "out_of_stock" : 
                     newStock <= selectedItem.minStock ? "low_stock" : "in_stock";

    setInventory(inventory.map(item => 
      item.id === selectedItem.id 
        ? { ...item, currentStock: newStock, status: newStatus }
        : item
    ));

    toast.success(`Stock mis à jour: ${stockAdjustment.type === "add" ? "+" : "-"}${stockAdjustment.quantity}`);
    setStockAdjustment({ type: "add", quantity: 0, reason: "" });
  };

  const lowStockItems = inventory.filter(item => item.status === "low_stock" || item.status === "out_of_stock");
  const totalValue = inventory.reduce((sum, item) => sum + (item.currentStock * item.cost), 0);

  const StockAdjustmentDialog = () => {
    if (!selectedItem) return null;

    return (
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajuster le stock</DialogTitle>
          <DialogDescription>
            {selectedItem.productName} - Stock actuel: {selectedItem.currentStock}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={stockAdjustment.type === "add" ? "default" : "outline"}
              onClick={() => setStockAdjustment({...stockAdjustment, type: "add"})}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
            <Button
              variant={stockAdjustment.type === "remove" ? "default" : "outline"}
              onClick={() => setStockAdjustment({...stockAdjustment, type: "remove"})}
              className="w-full"
            >
              <Minus className="h-4 w-4 mr-2" />
              Retirer
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantité</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={stockAdjustment.quantity}
              onChange={(e) => setStockAdjustment({...stockAdjustment, quantity: Number(e.target.value)})}
              placeholder="Quantité à ajuster"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Raison (optionnel)</Label>
            <Input
              id="reason"
              value={stockAdjustment.reason}
              onChange={(e) => setStockAdjustment({...stockAdjustment, reason: e.target.value})}
              placeholder="Réception, vente, casse..."
            />
          </div>

          <Button 
            onClick={handleStockAdjustment} 
            className="w-full bg-olive-700 hover:bg-olive-800"
            disabled={stockAdjustment.quantity <= 0}
          >
            {stockAdjustment.type === "add" ? "Ajouter" : "Retirer"} {stockAdjustment.quantity} unité(s)
          </Button>
        </div>
      </DialogContent>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-serif font-semibold text-stone-800">
            Gestion des stocks
          </h2>
          <p className="text-stone-600">
            Suivez et gérez l'inventaire de vos produits
          </p>
        </div>
        
        <Button className="bg-olive-700 hover:bg-olive-800">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser les stocks
        </Button>
      </div>

      {/* Alerts */}
      {lowStockItems.length > 0 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>Attention:</strong> {lowStockItems.length} produit(s) en rupture ou stock faible nécessitent votre attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-stone-600">Valeur du stock</p>
                <p className="text-2xl font-bold text-olive-600">
                  {totalValue.toFixed(0)}€
                </p>
              </div>
              <Package className="h-8 w-8 text-olive-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-stone-600">En stock</p>
                <p className="text-2xl font-bold text-green-600">
                  {inventory.filter(i => i.status === "in_stock").length}
                </p>
              </div>
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <div className="h-3 w-3 bg-green-600 rounded-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-stone-600">Stock faible</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {inventory.filter(i => i.status === "low_stock").length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-stone-600">Rupture</p>
                <p className="text-2xl font-bold text-red-600">
                  {inventory.filter(i => i.status === "out_of_stock").length}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                <Input
                  placeholder="Rechercher par nom ou SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500"
            >
              <option value="all">Tous les statuts</option>
              <option value="in_stock">En stock</option>
              <option value="low_stock">Stock faible</option>
              <option value="out_of_stock">Rupture</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th className="text-left p-4 font-medium text-stone-700">Produit</th>
                  <th className="text-left p-4 font-medium text-stone-700">SKU</th>
                  <th className="text-left p-4 font-medium text-stone-700">Stock</th>
                  <th className="text-left p-4 font-medium text-stone-700">Coût/Prix</th>
                  <th className="text-left p-4 font-medium text-stone-700">Marge</th>
                  <th className="text-left p-4 font-medium text-stone-700">Fournisseur</th>
                  <th className="text-left p-4 font-medium text-stone-700">Statut</th>
                  <th className="text-left p-4 font-medium text-stone-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map((item) => (
                  <tr key={item.id} className="border-b border-stone-200 hover:bg-stone-50">
                    <td className="p-4">
                      <div>
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-sm text-stone-600">
                          Dernière réception: {new Date(item.lastRestocked).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline">{item.sku}</Badge>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-semibold">{item.currentStock}</p>
                        <p className="text-xs text-stone-600">
                          Min: {item.minStock} | Max: {item.maxStock}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="text-sm">{item.cost}€ / {item.sellPrice}€</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className="text-green-700">
                        {calculateMargin(item.cost, item.sellPrice)}%
                      </Badge>
                    </td>
                    <td className="p-4">
                      <p className="text-sm">{item.supplier}</p>
                    </td>
                    <td className="p-4">
                      <Badge className={getStatusColor(item.status)}>
                        {getStatusIcon(item.status)}
                        <span className="ml-1">{getStatusText(item.status)}</span>
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedItem(item)}
                          >
                            <BarChart3 className="h-4 w-4 mr-1" />
                            Ajuster
                          </Button>
                        </DialogTrigger>
                        <StockAdjustmentDialog />
                      </Dialog>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredInventory.length === 0 && (
            <div className="p-12 text-center">
              <Package className="h-12 w-12 text-stone-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-stone-800 mb-2">
                Aucun produit trouvé
              </h3>
              <p className="text-stone-600">
                Aucun produit ne correspond à vos critères de recherche.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Low Stock Products */}
      {lowStockItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-yellow-700">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Produits nécessitant une attention
            </CardTitle>
            <CardDescription>
              Produits en rupture ou avec un stock faible
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lowStockItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border border-yellow-200 bg-yellow-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(item.status)}
                    <div>
                      <p className="font-medium text-stone-800">{item.productName}</p>
                      <p className="text-sm text-stone-600">
                        Stock actuel: {item.currentStock} | Minimum recommandé: {item.minStock}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Truck className="h-4 w-4 mr-1" />
                      Commander
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          size="sm" 
                          className="bg-olive-700 hover:bg-olive-800"
                          onClick={() => setSelectedItem(item)}
                        >
                          Ajuster
                        </Button>
                      </DialogTrigger>
                      <StockAdjustmentDialog />
                    </Dialog>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminInventory;