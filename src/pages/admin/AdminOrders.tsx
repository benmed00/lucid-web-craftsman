import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Search, 
  Filter, 
  Eye, 
  Package,
  Truck,
  CheckCircle,
  Clock,
  Mail,
  Phone,
  MapPin,
  ShoppingCart
} from "lucide-react";
import { toast } from "sonner";

// Mock orders data - replace with Supabase data
const mockOrders = [
  {
    id: 1,
    orderNumber: "CMD-2024-001",
    customerName: "Marie Dubois",
    email: "marie.dubois@email.com",
    phone: "+33 6 12 34 56 78",
    address: "15 rue de la Paix, 75001 Paris",
    total: 145,
    status: "pending",
    paymentStatus: "paid",
    date: "2024-01-15T10:30:00",
    items: [
      { id: 1, name: "Sac à Main Tissé Traditionnel", quantity: 1, price: 89 },
      { id: 2, name: "Chapeau de Paille Berbère", quantity: 1, price: 45 },
    ],
    shippingMethod: "Colissimo",
    trackingNumber: null
  },
  {
    id: 2,
    orderNumber: "CMD-2024-002",
    customerName: "Jean Martin",
    email: "jean.martin@email.com",
    phone: "+33 6 98 76 54 32",
    address: "42 avenue des Champs, 69000 Lyon",
    total: 89,
    status: "shipped",
    paymentStatus: "paid",
    date: "2024-01-14T14:20:00",
    items: [
      { id: 1, name: "Sac à Main Tissé Traditionnel", quantity: 1, price: 89 }
    ],
    shippingMethod: "Chronopost",
    trackingNumber: "CP123456789FR"
  },
  {
    id: 3,
    orderNumber: "CMD-2024-003",
    customerName: "Sophie Laurent",
    email: "sophie.laurent@email.com",
    phone: "+33 6 55 44 33 22",
    address: "8 rue du Commerce, 33000 Bordeaux",
    total: 267,
    status: "completed",
    paymentStatus: "paid",
    date: "2024-01-13T16:45:00",
    items: [
      { id: 1, name: "Sac à Main Tissé Traditionnel", quantity: 1, price: 89 },
      { id: 3, name: "Pochette Brodée à la Main", quantity: 1, price: 62 },
      { id: 4, name: "Cabas en Fibres Naturelles", quantity: 1, price: 75 },
    ],
    shippingMethod: "Mondial Relay",
    trackingNumber: "MR987654321FR"
  },
  {
    id: 4,
    orderNumber: "CMD-2024-004",
    customerName: "Pierre Moreau",
    email: "pierre.moreau@email.com",
    phone: "+33 6 11 22 33 44",
    address: "23 boulevard Saint-Germain, 13000 Marseille",
    total: 97,
    status: "pending",
    paymentStatus: "pending",
    date: "2024-01-16T09:15:00",
    items: [
      { id: 5, name: "Chapeau de Soleil Tressé", quantity: 1, price: 52 },
      { id: 2, name: "Chapeau de Paille Berbère", quantity: 1, price: 45 },
    ],
    shippingMethod: "Colissimo",
    trackingNumber: null
  },
];

const AdminOrders = () => {
  const [orders, setOrders] = useState(mockOrders);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<typeof mockOrders[0] | null>(null);

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || order.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "shipped": return "bg-blue-100 text-blue-800 border-blue-200";
      case "completed": return "bg-green-100 text-green-800 border-green-200";
      default: return "bg-stone-100 text-stone-800 border-stone-200";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending": return "En attente";
      case "shipped": return "Expédiée";
      case "completed": return "Terminée";
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="h-4 w-4" />;
      case "shipped": return <Truck className="h-4 w-4" />;
      case "completed": return <CheckCircle className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-green-100 text-green-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "failed": return "bg-red-100 text-red-800";
      default: return "bg-stone-100 text-stone-800";
    }
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case "paid": return "Payé";
      case "pending": return "En attente";
      case "failed": return "Échoué";
      default: return status;
    }
  };

  const updateOrderStatus = (orderId: number, newStatus: string) => {
    setOrders(orders.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    ));
    toast.success("Statut de la commande mis à jour");
  };

  const addTrackingNumber = (orderId: number, trackingNumber: string) => {
    setOrders(orders.map(order => 
      order.id === orderId ? { ...order, trackingNumber } : order
    ));
    toast.success("Numéro de suivi ajouté");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const OrderDetailDialog = () => {
    if (!selectedOrder) return null;

    return (
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Commande {selectedOrder.orderNumber}
            <Badge className={getStatusColor(selectedOrder.status)}>
              {getStatusIcon(selectedOrder.status)}
              <span className="ml-1">{getStatusText(selectedOrder.status)}</span>
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Passée le {formatDate(selectedOrder.date)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informations client</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-stone-100 rounded-lg">
                  <Mail className="h-4 w-4 text-stone-600" />
                </div>
                <div>
                  <p className="font-medium">{selectedOrder.customerName}</p>
                  <p className="text-sm text-stone-600">{selectedOrder.email}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-stone-100 rounded-lg">
                  <Phone className="h-4 w-4 text-stone-600" />
                </div>
                <p className="text-sm">{selectedOrder.phone}</p>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-stone-100 rounded-lg">
                  <MapPin className="h-4 w-4 text-stone-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Adresse de livraison</p>
                  <p className="text-sm text-stone-600">{selectedOrder.address}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Articles commandés</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedOrder.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-stone-200 last:border-0">
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-stone-600">Quantité: {item.quantity}</p>
                    </div>
                    <p className="font-semibold">{item.price}€</p>
                  </div>
                ))}
                <div className="pt-3 border-t border-stone-300">
                  <div className="flex justify-between items-center">
                    <p className="font-semibold">Total</p>
                    <p className="font-bold text-lg">{selectedOrder.total}€</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment & Shipping */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Paiement</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className={getPaymentStatusColor(selectedOrder.paymentStatus)}>
                  {getPaymentStatusText(selectedOrder.paymentStatus)}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Expédition</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm">
                  <span className="font-medium">Méthode:</span> {selectedOrder.shippingMethod}
                </p>
                {selectedOrder.trackingNumber && (
                  <p className="text-sm">
                    <span className="font-medium">Suivi:</span> {selectedOrder.trackingNumber}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Status Management */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Gestion du statut</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant={selectedOrder.status === "pending" ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateOrderStatus(selectedOrder.id, "pending")}
                  className="flex-1"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  En attente
                </Button>
                <Button
                  variant={selectedOrder.status === "shipped" ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateOrderStatus(selectedOrder.id, "shipped")}
                  className="flex-1"
                >
                  <Truck className="h-4 w-4 mr-2" />
                  Expédiée
                </Button>
                <Button
                  variant={selectedOrder.status === "completed" ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateOrderStatus(selectedOrder.id, "completed")}
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Terminée
                </Button>
              </div>

              {selectedOrder.status === "shipped" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Numéro de suivi</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Entrer le numéro de suivi"
                      defaultValue={selectedOrder.trackingNumber || ""}
                      onBlur={(e) => {
                        if (e.target.value) {
                          addTrackingNumber(selectedOrder.id, e.target.value);
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
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
            Gestion des commandes
          </h2>
          <p className="text-stone-600">
            {orders.length} commandes au total
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-stone-600">En attente</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {orders.filter(o => o.status === "pending").length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-stone-600">Expédiées</p>
                <p className="text-2xl font-bold text-blue-600">
                  {orders.filter(o => o.status === "shipped").length}
                </p>
              </div>
              <Truck className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-stone-600">Terminées</p>
                <p className="text-2xl font-bold text-green-600">
                  {orders.filter(o => o.status === "completed").length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-stone-600">Chiffre d'affaires</p>
                <p className="text-2xl font-bold text-olive-600">
                  {orders.reduce((sum, order) => sum + order.total, 0)}€
                </p>
              </div>
              <Package className="h-8 w-8 text-olive-600" />
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
                  placeholder="Rechercher par numéro, nom ou email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="shipped">Expédiées</SelectItem>
                <SelectItem value="completed">Terminées</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th className="text-left p-4 font-medium text-stone-700">Commande</th>
                  <th className="text-left p-4 font-medium text-stone-700">Client</th>
                  <th className="text-left p-4 font-medium text-stone-700">Date</th>
                  <th className="text-left p-4 font-medium text-stone-700">Total</th>
                  <th className="text-left p-4 font-medium text-stone-700">Statut</th>
                  <th className="text-left p-4 font-medium text-stone-700">Paiement</th>
                  <th className="text-left p-4 font-medium text-stone-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b border-stone-200 hover:bg-stone-50">
                    <td className="p-4">
                      <div>
                        <p className="font-medium">{order.orderNumber}</p>
                        <p className="text-sm text-stone-600">
                          {order.items.length} article{order.items.length > 1 ? 's' : ''}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-medium">{order.customerName}</p>
                        <p className="text-sm text-stone-600">{order.email}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-sm">
                        {new Date(order.date).toLocaleDateString('fr-FR')}
                      </p>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold">{order.total}€</p>
                    </td>
                    <td className="p-4">
                      <Badge className={getStatusColor(order.status)}>
                        {getStatusIcon(order.status)}
                        <span className="ml-1">{getStatusText(order.status)}</span>
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge className={getPaymentStatusColor(order.paymentStatus)}>
                        {getPaymentStatusText(order.paymentStatus)}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedOrder(order)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Voir
                          </Button>
                        </DialogTrigger>
                        <OrderDetailDialog />
                      </Dialog>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredOrders.length === 0 && (
            <div className="p-12 text-center">
              <ShoppingCart className="h-12 w-12 text-stone-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-stone-800 mb-2">
                Aucune commande trouvée
              </h3>
              <p className="text-stone-600">
                {searchQuery || filterStatus !== "all" 
                  ? "Aucune commande ne correspond à vos critères de recherche."
                  : "Vous n'avez pas encore reçu de commandes."
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminOrders;