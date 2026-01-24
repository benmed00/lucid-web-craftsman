import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { OrderStatus } from '@/types/order.types';
import { ORDER_STATUS_CONFIG } from '@/types/order.types';
import {
  FileText,
  Clock,
  XCircle,
  CheckCircle,
  CheckCircle2,
  Loader,
  Package,
  Truck,
  Navigation,
  AlertTriangle,
  PackageCheck,
  RotateCcw,
  RefreshCw,
  Archive,
} from 'lucide-react';

const iconMap = {
  FileText,
  Clock,
  XCircle,
  CheckCircle,
  CheckCircle2,
  Loader,
  Package,
  Truck,
  Navigation,
  AlertTriangle,
  PackageCheck,
  RotateCcw,
  RefreshCw,
  Archive,
};

interface OrderStatusBadgeProps {
  status: OrderStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  locale?: 'fr' | 'en';
}

export function OrderStatusBadge({ 
  status, 
  size = 'md', 
  showIcon = true,
  locale = 'fr',
}: OrderStatusBadgeProps) {
  const config = ORDER_STATUS_CONFIG[status];
  if (!config) return <Badge variant="outline">{status}</Badge>;

  const Icon = iconMap[config.icon as keyof typeof iconMap];
  const label = locale === 'fr' ? config.labelFr : config.label;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium border-none inline-flex items-center gap-1.5',
        config.bgColor,
        config.color,
        sizeClasses[size]
      )}
    >
      {showIcon && Icon && <Icon className={cn(
        size === 'sm' && 'h-3 w-3',
        size === 'md' && 'h-3.5 w-3.5',
        size === 'lg' && 'h-4 w-4',
      )} />}
      {label}
    </Badge>
  );
}
