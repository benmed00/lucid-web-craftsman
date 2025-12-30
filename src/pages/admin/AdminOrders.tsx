import React, { useEffect, useState } from 'react';
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Package2, Search, Eye, RefreshCw, DollarSign, ShoppingCart, Clock, Truck, CheckCircle, Package, Filter, Mail, Phone, MapPin } from "lucide-react";
import { toast } from "sonner";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AddOrderDialog } from "@/components/admin/AddOrderDialog";
import { ManualTestOrderStatus } from "@/components/admin/ManualTestOrderStatus";
import { TestOrderEmailButton } from "@/components/admin/TestOrderEmailButton";
import { TestShippingEmailButton } from "@/components/admin/TestShippingEmailButton";
import { SendShippingEmailButton } from "@/components/admin/SendShippingEmailButton";
import { SendDeliveryEmailButton } from "@/components/admin/SendDeliveryEmailButton";
import { SendCancellationEmailButton } from "@/components/admin/SendCancellationEmailButton";

interface OrderItem {
  id: string;
  product_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_snapshot: any;
}

interface Order {
  id: string;
  user_id: string | null;
  amount: number;
  currency: string;
  status: string;
  stripe_session_id: string | null;
  created_at: string;
  updated_at: string;
  order_items: OrderItem[];
  payments?: any[];
}
const AdminOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [shippingDialogOpen, setShippingDialogOpen] = useState(false);
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
  const [cancellationDialogOpen, setCancellationDialogOpen] = useState(false);
  const [pendingShippedOrder, setPendingShippedOrder] = useState<Order | null>(null);
  const [pendingDeliveredOrder, setPendingDeliveredOrder] = useState<Order | null>(null);
  const [pendingCancelledOrder, setPendingCancelledOrder] = useState<Order | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            product_id,
            quantity,
            unit_price,
            total_price,
            product_snapshot
          ),
          payments (
            id,
            status,
            amount,
            processed_at
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setOrders((data as Order[]) || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Erreur lors du chargement des commandes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const updateOrderStatus = async (orderId: string, newStatus: string, skipPrompt = false) => {
    const order = orders.find(o => o.id === orderId);
    
    // If changing to shipped, prompt for shipping notification
    if (newStatus === 'shipped' && !skipPrompt && order) {
      setPendingShippedOrder(order);
      setShippingDialogOpen(true);
      return;
    }

    // If changing to delivered, prompt for delivery notification
    if (newStatus === 'delivered' && !skipPrompt && order) {
      setPendingDeliveredOrder(order);
      setDeliveryDialogOpen(true);
      return;
    }

    // If changing to cancelled or refunded, prompt for cancellation notification
    if ((newStatus === 'cancelled' || newStatus === 'refunded') && !skipPrompt && order) {
      setPendingCancelledOrder(order);
      setCancellationDialogOpen(true);
      return;
    }

    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      toast.success('Statut de commande mis à jour');
      fetchOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleShippingDialogClose = () => {
    setShippingDialogOpen(false);
    setPendingShippedOrder(null);
  };

  const handleShippingEmailSent = () => {
    if (pendingShippedOrder) {
      // Update status after email is sent
      updateOrderStatus(pendingShippedOrder.id, 'shipped', true);
    }
    handleShippingDialogClose();
  };

  const handleSkipShippingEmail = () => {
    if (pendingShippedOrder) {
      updateOrderStatus(pendingShippedOrder.id, 'shipped', true);
    }
    handleShippingDialogClose();
  };

  // Delivery dialog handlers
  const handleDeliveryDialogClose = () => {
    setDeliveryDialogOpen(false);
    setPendingDeliveredOrder(null);
  };

  const handleDeliveryEmailSent = () => {
    if (pendingDeliveredOrder) {
      updateOrderStatus(pendingDeliveredOrder.id, 'delivered', true);
    }
    handleDeliveryDialogClose();
  };

  const handleSkipDeliveryEmail = () => {
    if (pendingDeliveredOrder) {
      updateOrderStatus(pendingDeliveredOrder.id, 'delivered', true);
    }
    handleDeliveryDialogClose();
  };

  // Cancellation dialog handlers
  const handleCancellationDialogClose = () => {
    setCancellationDialogOpen(false);
    setPendingCancelledOrder(null);
  };

  const handleCancellationEmailSent = () => {
    if (pendingCancelledOrder) {
      // Determine status based on context - default to cancelled
      updateOrderStatus(pendingCancelledOrder.id, pendingCancelledOrder.status === 'refunded' ? 'refunded' : 'cancelled', true);
    }
    handleCancellationDialogClose();
  };

  const handleSkipCancellationEmail = (status: 'cancelled' | 'refunded') => {
    if (pendingCancelledOrder) {
      updateOrderStatus(pendingCancelledOrder.id, status, true);
    }
    handleCancellationDialogClose();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: 'En attente', variant: 'outline' },
      paid: { label: 'Payée', variant: 'default' },
      processing: { label: 'En cours', variant: 'secondary' },
      shipped: { label: 'Expédiée', variant: 'default' },
      delivered: { label: 'Livrée', variant: 'default' },
      cancelled: { label: 'Annulée', variant: 'destructive' },
      refunded: { label: 'Remboursée', variant: 'destructive' }
    };

    const config = statusConfig[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = searchTerm === '' || 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.stripe_session_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.order_items.some(item => 
        item.product_snapshot?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const totalRevenue = orders
    .filter(order => order.status === 'paid' || order.status === 'processing' || order.status === 'shipped' || order.status === 'delivered')
    .reduce((sum, order) => sum + (order.amount || 0), 0);

  const totalOrders = orders.length;
  const pendingOrders = orders.filter(order => order.status === 'pending').length;

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Simplified dialog - just show basic order info
  const OrderDetailDialog = () => {
    if (!selectedOrder) return null;

    return (
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Commande {selectedOrder.id.slice(-8)}</DialogTitle>
          <DialogDescription>
            {format(new Date(selectedOrder.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Articles:</h4>
            {selectedOrder.order_items.map((item) => (
              <div key={item.id} className="flex justify-between">
                <span>{item.product_snapshot?.name || 'Produit'} × {item.quantity}</span>
                <span>{(item.total_price).toFixed(2)} €</span>
              </div>
            ))}
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="font-medium">Total:</span>
            <span className="font-bold">{(selectedOrder.amount / 100).toFixed(2)} €</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <h4 className="font-medium mb-2">Changer le statut:</h4>
              <Select value={selectedOrder.status} onValueChange={(status) => updateOrderStatus(selectedOrder.id, status)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="paid">Payée</SelectItem>
                  <SelectItem value="processing">En cours</SelectItem>
                  <SelectItem value="shipped">Expédiée</SelectItem>
                  <SelectItem value="delivered">Livrée</SelectItem>
                  <SelectItem value="cancelled">Annulée</SelectItem>
                  <SelectItem value="refunded">Remboursée</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Action buttons based on status */}
          <div className="flex flex-wrap gap-2 pt-2">
            {(selectedOrder.status === 'shipped' || selectedOrder.status === 'processing') && (
              <SendShippingEmailButton 
                orderId={selectedOrder.id}
                orderItems={selectedOrder.order_items}
              />
            )}
            {selectedOrder.status === 'shipped' && (
              <SendDeliveryEmailButton 
                orderId={selectedOrder.id}
                orderItems={selectedOrder.order_items}
              />
            )}
            {(selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'refunded') && (
              <SendCancellationEmailButton 
                orderId={selectedOrder.id}
                orderAmount={selectedOrder.amount}
                orderItems={selectedOrder.order_items}
              />
            )}
          </div>
        </div>
      </DialogContent>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestion des Commandes</h1>
          <p className="text-muted-foreground">Gérez toutes les commandes de votre boutique</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AddOrderDialog onOrderAdded={fetchOrders} />
          <ManualTestOrderStatus />
          <TestOrderEmailButton />
          <TestShippingEmailButton />
          <Button onClick={fetchOrders} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En attente</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {orders.filter(o => o.status === "pending").length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expédiées</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {orders.filter(o => o.status === "shipped").length}
                </p>
              </div>
              <Truck className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Terminées</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {orders.filter(o => o.status === "completed").length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Chiffre d'affaires</p>
                <p className="text-2xl font-bold text-primary">
                  {(totalRevenue / 100).toFixed(2)} €
                </p>
              </div>
              <Package className="h-8 w-8 text-primary" />
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
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par numéro, nom ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
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
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="text-left p-4 font-medium text-foreground">Commande</th>
                  <th className="text-left p-4 font-medium text-foreground">Client</th>
                  <th className="text-left p-4 font-medium text-foreground">Date</th>
                  <th className="text-left p-4 font-medium text-foreground">Total</th>
                  <th className="text-left p-4 font-medium text-foreground">Statut</th>
                  <th className="text-left p-4 font-medium text-foreground">Paiement</th>
                  <th className="text-left p-4 font-medium text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b border-border hover:bg-muted/50">
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-foreground">{order.id.slice(-8)}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.order_items.length} article{order.order_items.length > 1 ? 's' : ''}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-foreground">Client #{order.user_id?.slice(-8) || 'Invité'}</p>
                        <p className="text-sm text-muted-foreground">{order.stripe_session_id?.slice(-8) || 'N/A'}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-sm">
                        {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                      </p>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold">{(order.amount / 100).toFixed(2)} €</p>
                    </td>
                    <td className="p-4">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="p-4">
                      <Badge variant="default">Stripe</Badge>
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
              <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Aucune commande trouvée
              </h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "all" 
                  ? "Aucune commande ne correspond à vos critères de recherche."
                  : "Vous n'avez pas encore reçu de commandes."
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shipping Notification Dialog */}
      <Dialog open={shippingDialogOpen} onOpenChange={setShippingDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Envoyer une notification d'expédition ?</DialogTitle>
            <DialogDescription>
              Voulez-vous envoyer un email au client pour l'informer que sa commande a été expédiée ?
            </DialogDescription>
          </DialogHeader>
          {pendingShippedOrder && (
            <div className="py-4">
              <SendShippingEmailButton 
                orderId={pendingShippedOrder.id}
                orderItems={pendingShippedOrder.order_items}
                onEmailSent={handleShippingEmailSent}
              />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleSkipShippingEmail}>Passer</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delivery Notification Dialog */}
      <Dialog open={deliveryDialogOpen} onOpenChange={setDeliveryDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmer la livraison ?</DialogTitle>
            <DialogDescription>
              Voulez-vous envoyer un email au client pour confirmer la livraison ?
            </DialogDescription>
          </DialogHeader>
          {pendingDeliveredOrder && (
            <div className="py-4">
              <SendDeliveryEmailButton 
                orderId={pendingDeliveredOrder.id}
                orderItems={pendingDeliveredOrder.order_items}
                onEmailSent={handleDeliveryEmailSent}
              />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleSkipDeliveryEmail}>Passer</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancellation Notification Dialog */}
      <Dialog open={cancellationDialogOpen} onOpenChange={setCancellationDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Notifier l'annulation ?</DialogTitle>
            <DialogDescription>
              Voulez-vous envoyer un email au client concernant l'annulation/remboursement ?
            </DialogDescription>
          </DialogHeader>
          {pendingCancelledOrder && (
            <div className="py-4">
              <SendCancellationEmailButton 
                orderId={pendingCancelledOrder.id}
                orderAmount={pendingCancelledOrder.amount}
                orderItems={pendingCancelledOrder.order_items}
                onEmailSent={handleCancellationEmailSent}
              />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => handleSkipCancellationEmail('cancelled')}>Passer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOrders;