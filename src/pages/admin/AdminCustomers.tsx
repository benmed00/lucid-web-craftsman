import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Users, 
  Mail, 
  Phone, 
  MapPin,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  UserPlus,
  Calendar,
  Package
} from "lucide-react";
import { toast } from "sonner";

// Mock customers data - replace with Supabase data
const mockCustomers = [
  {
    id: 1,
    name: "Marie Dubois",
    email: "marie.dubois@email.com",
    phone: "+33 6 12 34 56 78",
    address: "15 rue de la Paix, 75001 Paris",
    registrationDate: "2023-12-15",
    totalOrders: 3,
    totalSpent: 267,
    lastOrderDate: "2024-01-15",
    status: "active"
  },
  {
    id: 2,
    name: "Jean Martin",
    email: "jean.martin@email.com",
    phone: "+33 6 98 76 54 32",
    address: "42 avenue des Champs, 69000 Lyon",
    registrationDate: "2024-01-10",
    totalOrders: 1,
    totalSpent: 89,
    lastOrderDate: "2024-01-14",
    status: "active"
  },
  {
    id: 3,
    name: "Sophie Laurent",
    email: "sophie.laurent@email.com",
    phone: "+33 6 55 44 33 22",
    address: "8 rue du Commerce, 33000 Bordeaux",
    registrationDate: "2023-11-20",
    totalOrders: 5,
    totalSpent: 445,
    lastOrderDate: "2024-01-13",
    status: "vip"
  },
  {
    id: 4,
    name: "Pierre Moreau",
    email: "pierre.moreau@email.com",
    phone: "+33 6 11 22 33 44",
    address: "23 boulevard Saint-Germain, 13000 Marseille",
    registrationDate: "2024-01-01",
    totalOrders: 0,
    totalSpent: 0,
    lastOrderDate: null,
    status: "inactive"
  }
];

const AdminCustomers = () => {
  const [customers, setCustomers] = useState(mockCustomers);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedCustomer, setSelectedCustomer] = useState<typeof mockCustomers[0] | null>(null);

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = 
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || customer.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800 border-green-200";
      case "vip": return "bg-purple-100 text-purple-800 border-purple-200";
      case "inactive": return "bg-stone-100 text-stone-800 border-stone-200";
      default: return "bg-stone-100 text-stone-800 border-stone-200";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active": return "Actif";
      case "vip": return "VIP";
      case "inactive": return "Inactif";
      default: return status;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Jamais";
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const CustomerDetailDialog = () => {
    if (!selectedCustomer) return null;

    return (
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            {selectedCustomer.name}
            <Badge className={getStatusColor(selectedCustomer.status)}>
              {getStatusText(selectedCustomer.status)}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Client depuis le {formatDate(selectedCustomer.registrationDate)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informations de contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-stone-600" />
                <span>{selectedCustomer.email}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-stone-600" />
                <span>{selectedCustomer.phone}</span>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="h-4 w-4 text-stone-600" />
                <span>{selectedCustomer.address}</span>
              </div>
            </CardContent>
          </Card>

          {/* Purchase History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Historique des achats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-stone-50 rounded-lg">
                  <Package className="h-6 w-6 mx-auto mb-2 text-olive-600" />
                  <p className="text-2xl font-bold">{selectedCustomer.totalOrders}</p>
                  <p className="text-sm text-stone-600">Commandes</p>
                </div>
                <div className="text-center p-4 bg-stone-50 rounded-lg">
                  <span className="text-2xl">💰</span>
                  <p className="text-2xl font-bold">{selectedCustomer.totalSpent}€</p>
                  <p className="text-sm text-stone-600">Total dépensé</p>
                </div>
              </div>
              {selectedCustomer.lastOrderDate && (
                <div className="mt-4 p-3 bg-olive-50 rounded-lg">
                  <p className="text-sm">
                    <strong>Dernière commande:</strong> {formatDate(selectedCustomer.lastOrderDate)}
                  </p>
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
            Gestion des clients
          </h2>
          <p className="text-stone-600">
            {customers.length} clients enregistrés
          </p>
        </div>
        
        <Button className="bg-olive-700 hover:bg-olive-800">
          <UserPlus className="h-4 w-4 mr-2" />
          Ajouter un client
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-stone-600">Total clients</p>
                <p className="text-2xl font-bold text-olive-600">
                  {customers.length}
                </p>
              </div>
              <Users className="h-8 w-8 text-olive-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-stone-600">Clients actifs</p>
                <p className="text-2xl font-bold text-green-600">
                  {customers.filter(c => c.status === "active").length}
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
                <p className="text-sm text-stone-600">Clients VIP</p>
                <p className="text-2xl font-bold text-purple-600">
                  {customers.filter(c => c.status === "vip").length}
                </p>
              </div>
              <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600 text-lg">👑</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-stone-600">Panier moyen</p>
                <p className="text-2xl font-bold text-blue-600">
                  {Math.round(customers.reduce((sum, c) => sum + c.totalSpent, 0) / customers.filter(c => c.totalOrders > 0).length) || 0}€
                </p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
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
                  placeholder="Rechercher par nom ou email..."
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
              <option value="active">Actifs</option>
              <option value="vip">VIP</option>
              <option value="inactive">Inactifs</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th className="text-left p-4 font-medium text-stone-700">Client</th>
                  <th className="text-left p-4 font-medium text-stone-700">Contact</th>
                  <th className="text-left p-4 font-medium text-stone-700">Inscription</th>
                  <th className="text-left p-4 font-medium text-stone-700">Commandes</th>
                  <th className="text-left p-4 font-medium text-stone-700">Total dépensé</th>
                  <th className="text-left p-4 font-medium text-stone-700">Statut</th>
                  <th className="text-left p-4 font-medium text-stone-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="border-b border-stone-200 hover:bg-stone-50">
                    <td className="p-4">
                      <div>
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-sm text-stone-600">ID: {customer.id}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="text-sm">{customer.email}</p>
                        <p className="text-sm text-stone-600">{customer.phone}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-sm">{formatDate(customer.registrationDate)}</p>
                    </td>
                    <td className="p-4">
                      <div className="text-center">
                        <p className="font-semibold">{customer.totalOrders}</p>
                        {customer.lastOrderDate && (
                          <p className="text-xs text-stone-600">
                            Dernière: {formatDate(customer.lastOrderDate)}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold">{customer.totalSpent}€</p>
                    </td>
                    <td className="p-4">
                      <Badge className={getStatusColor(customer.status)}>
                        {getStatusText(customer.status)}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedCustomer(customer)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <CustomerDetailDialog />
                        </Dialog>
                        
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredCustomers.length === 0 && (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 text-stone-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-stone-800 mb-2">
                Aucun client trouvé
              </h3>
              <p className="text-stone-600">
                {searchQuery || filterStatus !== "all" 
                  ? "Aucun client ne correspond à vos critères."
                  : "Vous n'avez pas encore de clients enregistrés."
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCustomers;