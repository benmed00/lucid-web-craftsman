import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AnomalyType, AnomalySeverity } from '@/types/order.types';
import { ANOMALY_SEVERITY_CONFIG, ANOMALY_TYPE_CONFIG } from '@/types/order.types';
import {
  CreditCard,
  Package,
  Truck,
  Shield,
  AlertCircle,
  User,
  Navigation,
} from 'lucide-react';

const iconMap = {
  CreditCard,
  Package,
  Truck,
  Shield,
  AlertCircle,
  User,
  Navigation,
};

interface AnomalySeverityBadgeProps {
  severity: AnomalySeverity;
  size?: 'sm' | 'md';
}

export function AnomalySeverityBadge({ severity, size = 'sm' }: AnomalySeverityBadgeProps) {
  const config = ANOMALY_SEVERITY_CONFIG[severity];
  
  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium border-none',
        config.bgColor,
        config.color,
        size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1'
      )}
    >
      {config.labelFr}
    </Badge>
  );
}

interface AnomalyTypeBadgeProps {
  type: AnomalyType;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export function AnomalyTypeBadge({ type, size = 'sm', showIcon = true }: AnomalyTypeBadgeProps) {
  const config = ANOMALY_TYPE_CONFIG[type];
  const Icon = iconMap[config.icon as keyof typeof iconMap];
  
  return (
    <Badge
      variant="secondary"
      className={cn(
        'font-medium inline-flex items-center gap-1',
        size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1'
      )}
    >
      {showIcon && Icon && <Icon className="h-3 w-3" />}
      {config.labelFr}
    </Badge>
  );
}
