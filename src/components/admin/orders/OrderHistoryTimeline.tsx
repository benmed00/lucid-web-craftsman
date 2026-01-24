import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { OrderStatusBadge } from './OrderStatusBadge';
import { useOrderHistory } from '@/hooks/useOrderManagement';
import type { OrderStatus, StatusChangeActor } from '@/types/order.types';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  User, 
  Bot, 
  Webhook, 
  Clock,
  ArrowRight,
} from 'lucide-react';

const actorIcons: Record<StatusChangeActor, typeof User> = {
  system: Bot,
  admin: User,
  customer: User,
  webhook: Webhook,
  scheduler: Clock,
};

const actorLabels: Record<StatusChangeActor, string> = {
  system: 'Système',
  admin: 'Admin',
  customer: 'Client',
  webhook: 'Webhook',
  scheduler: 'Planificateur',
};

interface OrderHistoryTimelineProps {
  orderId: string;
}

export function OrderHistoryTimeline({ orderId }: OrderHistoryTimelineProps) {
  const { data: history = [], isLoading } = useOrderHistory(orderId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Historique des statuts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Historique des statuts</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

            <div className="space-y-6">
              {history.map((entry, index) => {
                const ActorIcon = actorIcons[entry.changed_by];
                
                return (
                  <div key={entry.id} className="relative flex gap-4 pl-2">
                    {/* Timeline dot */}
                    <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-background border-2 border-primary">
                      <ActorIcon className="h-4 w-4 text-primary" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-4">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        {entry.previous_status && (
                          <>
                            <OrderStatusBadge 
                              status={entry.previous_status as OrderStatus} 
                              size="sm" 
                              showIcon={false}
                            />
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          </>
                        )}
                        <OrderStatusBadge 
                          status={entry.new_status as OrderStatus} 
                          size="sm"
                        />
                      </div>

                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>
                          {format(new Date(entry.created_at), 'PPpp', { locale: fr })}
                        </p>
                        <p>
                          Par: <span className="font-medium">{actorLabels[entry.changed_by]}</span>
                        </p>
                        {entry.reason_message && (
                          <p className="text-foreground bg-muted p-2 rounded mt-2">
                            {entry.reason_message}
                          </p>
                        )}
                        {entry.reason_code && (
                          <p className="text-xs">
                            Code: <code className="bg-muted px-1 rounded">{entry.reason_code}</code>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {history.length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-8">
                  Aucun historique disponible
                </p>
              )}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
