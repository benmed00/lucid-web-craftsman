import { useState } from 'react';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { OrderStatusBadge } from './OrderStatusBadge';
import { useValidTransitions, useUpdateOrderStatus } from '@/hooks/useOrderManagement';
import type { OrderStatus, OrderStateTransition } from '@/types/order.types';
import { ORDER_STATUS_CONFIG } from '@/types/order.types';
import { Loader2, AlertTriangle } from 'lucide-react';

interface OrderStatusSelectProps {
  orderId: string;
  currentStatus: OrderStatus;
  onStatusChange?: () => void;
}

export function OrderStatusSelect({ orderId, currentStatus, onStatusChange }: OrderStatusSelectProps) {
  const [selectedTransition, setSelectedTransition] = useState<OrderStateTransition | null>(null);
  const [reasonMessage, setReasonMessage] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: transitions = [], isLoading: loadingTransitions } = useValidTransitions(currentStatus);
  const updateStatus = useUpdateOrderStatus();

  const handleSelectChange = (value: string) => {
    const transition = transitions.find(t => t.to_status === value);
    if (!transition) return;

    if (transition.requires_reason) {
      setSelectedTransition(transition);
      setIsDialogOpen(true);
    } else {
      // Direct transition without reason
      updateStatus.mutate(
        { orderId, newStatus: value as OrderStatus },
        { onSuccess: onStatusChange }
      );
    }
  };

  const handleConfirmTransition = () => {
    if (!selectedTransition) return;

    updateStatus.mutate(
      {
        orderId,
        newStatus: selectedTransition.to_status,
        reasonMessage: reasonMessage || undefined,
      },
      {
        onSuccess: () => {
          setIsDialogOpen(false);
          setReasonMessage('');
          setSelectedTransition(null);
          onStatusChange?.();
        },
      }
    );
  };

  const isHighRiskTransition = selectedTransition?.requires_permission === 'full_access';

  return (
    <>
      <Select
        value={currentStatus}
        onValueChange={handleSelectChange}
        disabled={loadingTransitions || updateStatus.isPending || transitions.length === 0}
      >
        <SelectTrigger className="w-[200px]">
          {updateStatus.isPending ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Mise à jour...</span>
            </div>
          ) : (
            <SelectValue>
              <OrderStatusBadge status={currentStatus} size="sm" />
            </SelectValue>
          )}
        </SelectTrigger>
        <SelectContent>
          {/* Current status (disabled) */}
          <SelectItem value={currentStatus} disabled>
            <div className="flex items-center gap-2">
              <OrderStatusBadge status={currentStatus} size="sm" />
              <span className="text-muted-foreground text-xs">(actuel)</span>
            </div>
          </SelectItem>

          {/* Available transitions */}
          {transitions.map((transition) => {
            const config = ORDER_STATUS_CONFIG[transition.to_status];
            return (
              <SelectItem key={transition.to_status} value={transition.to_status}>
                <div className="flex items-center gap-2">
                  <OrderStatusBadge status={transition.to_status} size="sm" />
                  {transition.requires_reason && (
                    <span className="text-xs text-muted-foreground">(justification requise)</span>
                  )}
                  {transition.requires_permission === 'full_access' && (
                    <AlertTriangle className="h-3 w-3 text-orange-500" />
                  )}
                </div>
              </SelectItem>
            );
          })}

          {transitions.length === 0 && !loadingTransitions && (
            <div className="px-2 py-4 text-sm text-muted-foreground text-center">
              Aucune transition disponible
            </div>
          )}
        </SelectContent>
      </Select>

      {/* Confirmation Dialog for transitions requiring reason */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isHighRiskTransition && <AlertTriangle className="h-5 w-5 text-orange-500" />}
              Confirmer le changement de statut
            </DialogTitle>
            <DialogDescription>
              {selectedTransition && (
                <div className="mt-2 flex items-center gap-2">
                  <OrderStatusBadge status={currentStatus} size="sm" />
                  <span>→</span>
                  <OrderStatusBadge status={selectedTransition.to_status} size="sm" />
                </div>
              )}
              {selectedTransition?.description && (
                <p className="mt-2 text-sm">{selectedTransition.description}</p>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">
                Justification {selectedTransition?.requires_reason && <span className="text-red-500">*</span>}
              </Label>
              <Textarea
                id="reason"
                placeholder="Expliquez la raison de ce changement..."
                value={reasonMessage}
                onChange={(e) => setReasonMessage(e.target.value)}
                rows={3}
              />
            </div>

            {isHighRiskTransition && (
              <div className="rounded-lg bg-orange-50 p-3 text-sm text-orange-800">
                <strong>Attention :</strong> Cette action nécessite des privilèges super admin et sera auditée.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setReasonMessage('');
                setSelectedTransition(null);
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleConfirmTransition}
              disabled={
                updateStatus.isPending ||
                (selectedTransition?.requires_reason && !reasonMessage.trim())
              }
              variant={isHighRiskTransition ? 'destructive' : 'default'}
            >
              {updateStatus.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mise à jour...
                </>
              ) : (
                'Confirmer'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
