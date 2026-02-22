// Order Command Palette - Quick actions for order management
import { useState, useEffect, useMemo } from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  Truck,
  CreditCard,
  Mail,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RotateCcw,
  RefreshCw,
  FileText,
  User,
  Tag,
  Clock,
  Send,
  Archive,
  Eye,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { OrderStatus } from '@/types/order.types';
import { useUpdateOrderStatus } from '@/hooks/useOrderManagement';

interface CommandAction {
  id: string;
  label: string;
  shortcut?: string;
  icon: React.ReactNode;
  category: 'status' | 'communication' | 'logistics' | 'payment' | 'admin';
  action: () => Promise<void>;
  disabled?: boolean;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

interface OrderCommandPaletteProps {
  orderId: string;
  currentStatus: OrderStatus;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActionComplete?: () => void;
}

export function OrderCommandPalette({
  orderId,
  currentStatus,
  open,
  onOpenChange,
  onActionComplete,
}: OrderCommandPaletteProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const { mutateAsync: updateStatus } = useUpdateOrderStatus();

  // Keyboard shortcut to open
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  const executeAction = async (action: () => Promise<void>, label: string) => {
    setIsExecuting(true);
    try {
      await action();
      toast.success(`Action "${label}" effectuée`);
      onActionComplete?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Action error:', error);
      toast.error(
        `Erreur: ${error instanceof Error ? error.message : "Échec de l'action"}`
      );
    } finally {
      setIsExecuting(false);
    }
  };

  const actions: CommandAction[] = useMemo(
    () => [
      // Status Actions
      {
        id: 'validate',
        label: 'Valider la commande',
        shortcut: 'V',
        icon: <CheckCircle className="h-4 w-4 text-green-500" />,
        category: 'status',
        disabled: !['paid', 'validation_in_progress'].includes(currentStatus),
        action: async () => {
          await updateStatus({ orderId, newStatus: 'validated' });
        },
      },
      {
        id: 'prepare',
        label: 'Marquer en préparation',
        shortcut: 'P',
        icon: <Package className="h-4 w-4 text-blue-500" />,
        category: 'status',
        disabled: currentStatus !== 'validated',
        action: async () => {
          await updateStatus({ orderId, newStatus: 'preparing' });
        },
      },
      {
        id: 'ship',
        label: 'Marquer comme expédié',
        shortcut: 'S',
        icon: <Truck className="h-4 w-4 text-purple-500" />,
        category: 'status',
        disabled: currentStatus !== 'preparing',
        action: async () => {
          await updateStatus({ orderId, newStatus: 'shipped' });
        },
      },
      {
        id: 'deliver',
        label: 'Marquer comme livré',
        shortcut: 'D',
        icon: <CheckCircle className="h-4 w-4 text-green-600" />,
        category: 'status',
        disabled: !['shipped', 'in_transit'].includes(currentStatus),
        action: async () => {
          await updateStatus({ orderId, newStatus: 'delivered' });
        },
      },
      {
        id: 'cancel',
        label: 'Annuler la commande',
        icon: <XCircle className="h-4 w-4 text-red-500" />,
        category: 'status',
        disabled: ['delivered', 'cancelled', 'refunded'].includes(
          currentStatus
        ),
        badge: 'Attention',
        badgeVariant: 'destructive',
        action: async () => {
          await updateStatus({
            orderId,
            newStatus: 'cancelled',
            reasonMessage: 'Annulée via commandes rapides',
          });
        },
      },
      {
        id: 'archive',
        label: 'Archiver la commande',
        icon: <Archive className="h-4 w-4 text-gray-500" />,
        category: 'status',
        disabled: !['delivered', 'cancelled', 'refunded'].includes(
          currentStatus
        ),
        action: async () => {
          await updateStatus({ orderId, newStatus: 'archived' });
        },
      },

      // Communication Actions
      {
        id: 'send-confirmation',
        label: 'Renvoyer confirmation de commande',
        icon: <Mail className="h-4 w-4 text-blue-500" />,
        category: 'communication',
        action: async () => {
          const { error } = await supabase.functions.invoke(
            'send-order-confirmation',
            {
              body: { orderId, resend: true },
            }
          );
          if (error) throw error;
        },
      },
      {
        id: 'send-shipping',
        label: "Envoyer notification d'expédition",
        icon: <Send className="h-4 w-4 text-purple-500" />,
        category: 'communication',
        disabled: !['shipped', 'in_transit'].includes(currentStatus),
        action: async () => {
          const { error } = await supabase.functions.invoke(
            'send-shipping-notification',
            {
              body: { orderId },
            }
          );
          if (error) throw error;
        },
      },
      {
        id: 'send-delivery',
        label: 'Envoyer confirmation de livraison',
        icon: <CheckCircle className="h-4 w-4 text-green-500" />,
        category: 'communication',
        disabled: currentStatus !== 'delivered',
        action: async () => {
          const { error } = await supabase.functions.invoke(
            'send-delivery-confirmation',
            {
              body: { orderId },
            }
          );
          if (error) throw error;
        },
      },

      // Logistics Actions
      {
        id: 'update-tracking',
        label: 'Mettre à jour le suivi',
        icon: <Truck className="h-4 w-4" />,
        category: 'logistics',
        action: async () => {
          // This would open a dialog - for now just show toast
          toast.info('Ouvrir le panneau de suivi pour modifier');
        },
      },
      {
        id: 'check-stock',
        label: 'Vérifier le stock des articles',
        icon: <Package className="h-4 w-4" />,
        category: 'logistics',
        action: async () => {
          const { data, error } = await supabase
            .from('order_items')
            .select('product_id, quantity')
            .eq('order_id', orderId);

          if (error) throw error;

          const productIds = (data || [])
            .map((i) => i.product_id)
            .filter(Boolean) as number[];
          const { data: products } = await supabase
            .from('products')
            .select('id, name, price')
            .in('id', productIds);

          const stockInfo = (products || [])
            .map((p) => {
              const ordered =
                data?.find((i) => i.product_id === p.id)?.quantity || 0;
              return `${p.name}: (${ordered} commandé)`;
            })
            .join('\n');

          toast.info(stockInfo || 'Aucun article', { duration: 5000 });
        },
      },
      {
        id: 'request-return',
        label: 'Initier une demande de retour',
        icon: <RotateCcw className="h-4 w-4 text-orange-500" />,
        category: 'logistics',
        disabled: currentStatus !== 'delivered',
        action: async () => {
          await updateStatus({ orderId, newStatus: 'return_requested' });
        },
      },

      // Payment Actions
      {
        id: 'view-payment',
        label: 'Voir les détails de paiement',
        icon: <CreditCard className="h-4 w-4" />,
        category: 'payment',
        action: async () => {
          const { data } = await supabase
            .from('orders')
            .select('payment_method, payment_reference, amount, currency')
            .eq('id', orderId)
            .single();

          if (data) {
            toast.info(
              `${data.payment_method || 'N/A'}\nMontant: ${(data.amount / 100).toFixed(2)} ${data.currency?.toUpperCase()}\nRef: ${data.payment_reference?.slice(0, 20) || 'N/A'}`,
              { duration: 5000 }
            );
          }
        },
      },
      {
        id: 'process-refund',
        label: 'Traiter un remboursement',
        icon: <RefreshCw className="h-4 w-4 text-green-500" />,
        category: 'payment',
        badge: 'Admin',
        badgeVariant: 'secondary',
        disabled: [
          'created',
          'payment_pending',
          'cancelled',
          'refunded',
        ].includes(currentStatus),
        action: async () => {
          toast.info("Ouvrir l'onglet paiement pour traiter un remboursement");
        },
      },
      {
        id: 'mark-payment-failed',
        label: 'Marquer paiement échoué',
        icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
        category: 'payment',
        disabled: currentStatus !== 'payment_pending',
        action: async () => {
          await updateStatus({
            orderId,
            newStatus: 'payment_failed',
            reasonMessage: 'Marqué manuellement comme échoué',
          });
        },
      },

      // Admin Actions
      {
        id: 'view-history',
        label: "Voir l'historique complet",
        icon: <Clock className="h-4 w-4" />,
        category: 'admin',
        action: async () => {
          toast.info("Ouvrir l'onglet Historique");
        },
      },
      {
        id: 'view-anomalies',
        label: 'Voir les anomalies',
        icon: <AlertTriangle className="h-4 w-4 text-orange-500" />,
        category: 'admin',
        action: async () => {
          toast.info("Ouvrir l'onglet Anomalies");
        },
      },
      {
        id: 'view-customer',
        label: 'Voir le profil client',
        icon: <User className="h-4 w-4" />,
        category: 'admin',
        action: async () => {
          const { data } = await supabase
            .from('orders')
            .select('user_id')
            .eq('id', orderId)
            .single();

          if (data?.user_id) {
            window.open(`/admin/customers?id=${data.user_id}`, '_blank');
          } else {
            toast.info('Commande invité - pas de profil client');
          }
        },
      },
      {
        id: 'export-invoice',
        label: 'Exporter la facture',
        icon: <Download className="h-4 w-4" />,
        category: 'admin',
        action: async () => {
          toast.info('Fonctionnalité de facturation à implémenter');
        },
      },
      {
        id: 'add-note',
        label: 'Ajouter une note interne',
        icon: <FileText className="h-4 w-4" />,
        category: 'admin',
        action: async () => {
          toast.info('Ouvrir le panneau des notes');
        },
      },
      {
        id: 'check-fraud',
        label: 'Analyser le risque de fraude',
        icon: <Eye className="h-4 w-4 text-red-500" />,
        category: 'admin',
        action: async () => {
          toast.info("Ouvrir l'onglet Fraude");
        },
      },
      {
        id: 'apply-coupon',
        label: 'Appliquer un code promo',
        icon: <Tag className="h-4 w-4 text-purple-500" />,
        category: 'payment',
        disabled: !['created', 'payment_pending'].includes(currentStatus),
        action: async () => {
          toast.info('Fonctionnalité codes promo à implémenter');
        },
      },
    ],
    [orderId, currentStatus, updateStatus]
  );

  const groupedActions = useMemo(() => {
    const groups: Record<string, CommandAction[]> = {
      status: [],
      communication: [],
      logistics: [],
      payment: [],
      admin: [],
    };

    actions.forEach((action) => {
      groups[action.category].push(action);
    });

    return groups;
  }, [actions]);

  const categoryLabels: Record<string, string> = {
    status: 'Statut',
    communication: 'Communication',
    logistics: 'Logistique',
    payment: 'Paiement',
    admin: 'Administration',
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Rechercher une action... (⌘K)"
        disabled={isExecuting}
      />
      <CommandList>
        <CommandEmpty>Aucune action trouvée.</CommandEmpty>

        {Object.entries(groupedActions).map(
          ([category, categoryActions], index) => (
            <div key={category}>
              {index > 0 && <CommandSeparator />}
              <CommandGroup heading={categoryLabels[category]}>
                {categoryActions.map((action) => (
                  <CommandItem
                    key={action.id}
                    disabled={action.disabled || isExecuting}
                    onSelect={() => executeAction(action.action, action.label)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      {action.icon}
                      <span>{action.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {action.badge && (
                        <Badge
                          variant={action.badgeVariant || 'secondary'}
                          className="text-xs"
                        >
                          {action.badge}
                        </Badge>
                      )}
                      {action.shortcut && (
                        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                          {action.shortcut}
                        </kbd>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </div>
          )
        )}
      </CommandList>
    </CommandDialog>
  );
}
