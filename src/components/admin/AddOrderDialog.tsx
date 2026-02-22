import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ShoppingCart, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Product } from '@/shared/interfaces/Iproduct.interface';
import { useCurrency } from '@/stores/currencyStore';

interface OrderItem {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface AddOrderDialogProps {
  onOrderAdded: () => void;
}

export const AddOrderDialog = ({ onOrderAdded }: AddOrderDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const { formatPrice } = useCurrency();
  const [formData, setFormData] = useState({
    customer_id: '',
    status: 'pending',
    currency: 'EUR',
  });

  useEffect(() => {
    if (open) {
      fetchCustomers();
      fetchProducts();
    }
  }, [open]);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Erreur lors du chargement des clients');
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Erreur lors du chargement des produits');
    }
  };

  const addOrderItem = () => {
    setOrderItems([
      ...orderItems,
      {
        product_id: 0,
        product_name: '',
        quantity: 1,
        unit_price: 0,
        total_price: 0,
      },
    ]);
  };

  const removeOrderItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const updateOrderItem = (
    index: number,
    field: keyof OrderItem,
    value: string | number
  ) => {
    const updatedItems = [...orderItems];

    if (field === 'product_id') {
      const product = products.find((p) => p.id === parseInt(value as string));
      if (product) {
        updatedItems[index].product_id = product.id;
        updatedItems[index].product_name = product.name;
        updatedItems[index].unit_price = product.price;
        updatedItems[index].total_price =
          product.price * updatedItems[index].quantity;
      }
    } else if (field === 'quantity') {
      updatedItems[index].quantity = value as number;
      updatedItems[index].total_price =
        updatedItems[index].unit_price * (value as number);
    } else if (field === 'product_name') {
      updatedItems[index].product_name = value as string;
    } else if (field === 'unit_price') {
      updatedItems[index].unit_price = value as number;
      updatedItems[index].total_price =
        (value as number) * updatedItems[index].quantity;
    } else if (field === 'total_price') {
      updatedItems[index].total_price = value as number;
    }

    setOrderItems(updatedItems);
  };

  const calculateTotal = () => {
    return orderItems.reduce((total, item) => total + item.total_price, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customer_id) {
      toast.error('Veuillez sélectionner un client');
      return;
    }

    if (orderItems.length === 0) {
      toast.error('Veuillez ajouter au moins un produit');
      return;
    }

    setLoading(true);

    try {
      const totalAmount = Math.round(calculateTotal() * 100); // Convert to cents

      // Create order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: formData.customer_id,
          amount: totalAmount,
          status: formData.status,
          currency: formData.currency.toLowerCase(),
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItemsToInsert = orderItems.map((item) => ({
        order_id: orderData.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        product_snapshot: {
          name: item.product_name,
          price: item.unit_price,
        },
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsToInsert);

      if (itemsError) throw itemsError;

      toast.success('Commande créée avec succès');

      // Reset form
      setFormData({
        customer_id: '',
        status: 'pending',
        currency: 'EUR',
      });
      setOrderItems([]);
      setOpen(false);
      onOrderAdded();
    } catch (error: any) {
      console.error('Error creating order:', error);
      toast.error(
        `Erreur lors de la création de la commande: ${error.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <ShoppingCart className="h-4 w-4" />
          Ajouter une commande
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter une nouvelle commande</DialogTitle>
          <DialogDescription>
            Créez une commande manuelle pour un client existant.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer_id">Client *</Label>
              <Select
                value={formData.customer_id}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, customer_id: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un client" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.full_name || `Client ${customer.id.slice(-8)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Statut</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="paid">Payé</SelectItem>
                  <SelectItem value="processing">En cours</SelectItem>
                  <SelectItem value="shipped">Expédié</SelectItem>
                  <SelectItem value="delivered">Livré</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Devise</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, currency: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Articles de la commande</h3>
              <Button
                type="button"
                variant="outline"
                onClick={addOrderItem}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Ajouter un article
              </Button>
            </div>

            {orderItems.length === 0 ? (
              <div className="text-center py-8 text-stone-500">
                Aucun article ajouté. Cliquez sur "Ajouter un article" pour
                commencer.
              </div>
            ) : (
              <div className="space-y-3">
                {orderItems.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-4 p-4 border rounded-lg bg-stone-50"
                  >
                    <div className="flex-1">
                      <Select
                        value={item.product_id.toString()}
                        onValueChange={(value) =>
                          updateOrderItem(index, 'product_id', value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un produit" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem
                              key={product.id}
                              value={product.id.toString()}
                            >
                              {product.name} - {formatPrice(product.price)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-24">
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateOrderItem(
                            index,
                            'quantity',
                            parseInt(e.target.value) || 1
                          )
                        }
                        placeholder="Qté"
                      />
                    </div>

                    <div className="w-24 text-right font-medium">
                      {formatPrice(item.total_price)}
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeOrderItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                <div className="flex justify-end py-4 border-t">
                  <div className="text-xl font-bold">
                    Total: {formatPrice(calculateTotal())}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading || orderItems.length === 0}>
              {loading ? 'Création...' : 'Créer la commande'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
