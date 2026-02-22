// Order Management System Types
// Production-grade type definitions for order lifecycle

export type OrderStatus =
  | 'created'
  | 'payment_pending'
  | 'payment_failed'
  | 'paid'
  | 'validation_in_progress'
  | 'validated'
  | 'preparing'
  | 'shipped'
  | 'in_transit'
  | 'delivered'
  | 'delivery_failed'
  | 'partially_delivered'
  | 'return_requested'
  | 'returned'
  | 'refunded'
  | 'partially_refunded'
  | 'cancelled'
  | 'archived';

export type AnomalyType =
  | 'payment'
  | 'stock'
  | 'delivery'
  | 'fraud'
  | 'technical'
  | 'customer'
  | 'carrier';

export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

export type StatusChangeActor =
  | 'system'
  | 'admin'
  | 'customer'
  | 'webhook'
  | 'scheduler';

export type AdminOrderPermission = 'read_only' | 'operations' | 'full_access';

// Order entity with full lifecycle support
export interface Order {
  id: string;
  user_id: string | null;
  stripe_session_id: string | null;
  amount: number | null;
  currency: string;
  status: string;
  order_status: OrderStatus;
  payment_method: string | null;
  payment_reference: string | null;
  fraud_score: number | null;
  fraud_flags: string[];
  shipping_address: ShippingAddress | null;
  billing_address: BillingAddress | null;
  customer_notes: string | null;
  internal_notes: string | null;
  estimated_delivery: string | null;
  actual_delivery: string | null;
  carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  retry_count: number;
  last_retry_at: string | null;
  has_anomaly: boolean;
  anomaly_count: number;
  requires_attention: boolean;
  attention_reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
}

export interface ShippingAddress {
  first_name: string;
  last_name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  postal_code: string;
  country: string;
  phone?: string;
}

export interface BillingAddress extends ShippingAddress {
  company?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_snapshot: {
    name: string;
    price: number;
    image_url?: string;
    sku?: string;
  };
  created_at: string;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  previous_status: OrderStatus | null;
  new_status: OrderStatus;
  changed_by: StatusChangeActor;
  changed_by_user_id: string | null;
  reason_code: string | null;
  reason_message: string | null;
  free_comment: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface OrderAnomaly {
  id: string;
  order_id: string;
  anomaly_type: AnomalyType;
  severity: AnomalySeverity;
  title: string;
  description: string | null;
  detected_at: string;
  detected_by: StatusChangeActor;
  auto_resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  resolution_action: string | null;
  retry_count: number;
  max_retries: number;
  next_retry_at: string | null;
  escalated: boolean;
  escalated_at: string | null;
  escalated_to: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface OrderStateTransition {
  id: string;
  from_status: OrderStatus;
  to_status: OrderStatus;
  requires_permission: AdminOrderPermission;
  is_customer_allowed: boolean;
  requires_reason: boolean;
  auto_notify_customer: boolean;
  description: string | null;
}

export interface CustomerStatusMapping {
  internal_status: OrderStatus;
  customer_status_key: string;
  customer_status_label_fr: string;
  customer_status_label_en: string;
  customer_description_fr: string | null;
  customer_description_en: string | null;
  show_to_customer: boolean;
  display_order: number;
  icon_name: string | null;
  color_class: string | null;
}

// Customer view types
export interface CustomerOrderView {
  id: string;
  order_number: string;
  status: {
    key: string;
    label: string;
    description: string;
    icon: string;
    color: string;
  };
  total_amount: number;
  currency: string;
  items: CustomerOrderItem[];
  timeline: CustomerTimelineEvent[];
  tracking: {
    carrier: string;
    tracking_number: string;
    tracking_url: string;
  } | null;
  estimated_delivery: string | null;
  created_at: string;
}

export interface CustomerOrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  image_url?: string;
}

export interface CustomerTimelineEvent {
  status: string;
  label: string;
  timestamp: string;
  is_current: boolean;
}

// Admin dashboard types
export interface OrderFilters {
  status?: OrderStatus[];
  hasAnomaly?: boolean;
  requiresAttention?: boolean;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  carrier?: string;
}

export interface OrderStats {
  total: number;
  pending_payment: number;
  processing: number;
  shipped: number;
  delivered: number;
  anomalies: number;
  requires_attention: number;
}

// Status update request
export interface UpdateOrderStatusRequest {
  order_id: string;
  new_status: OrderStatus;
  reason_code?: string;
  reason_message?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateOrderStatusResponse {
  success: boolean;
  order_id?: string;
  old_status?: string;
  new_status?: string;
  history_id?: string;
  auto_notify?: boolean;
  error?: string;
  message?: string;
}

// Status configuration for UI
export const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  {
    label: string;
    labelFr: string;
    color: string;
    bgColor: string;
    icon: string;
    category:
      | 'payment'
      | 'fulfillment'
      | 'delivery'
      | 'post_delivery'
      | 'terminal';
  }
> = {
  created: {
    label: 'Created',
    labelFr: 'Créée',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    icon: 'FileText',
    category: 'payment',
  },
  payment_pending: {
    label: 'Payment Pending',
    labelFr: 'Paiement en attente',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    icon: 'Clock',
    category: 'payment',
  },
  payment_failed: {
    label: 'Payment Failed',
    labelFr: 'Paiement échoué',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    icon: 'XCircle',
    category: 'payment',
  },
  paid: {
    label: 'Paid',
    labelFr: 'Payée',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    icon: 'CheckCircle',
    category: 'payment',
  },
  validation_in_progress: {
    label: 'Validating',
    labelFr: 'Validation en cours',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    icon: 'Loader',
    category: 'fulfillment',
  },
  validated: {
    label: 'Validated',
    labelFr: 'Validée',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    icon: 'CheckCircle2',
    category: 'fulfillment',
  },
  preparing: {
    label: 'Preparing',
    labelFr: 'En préparation',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    icon: 'Package',
    category: 'fulfillment',
  },
  shipped: {
    label: 'Shipped',
    labelFr: 'Expédiée',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    icon: 'Truck',
    category: 'delivery',
  },
  in_transit: {
    label: 'In Transit',
    labelFr: 'En transit',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    icon: 'Navigation',
    category: 'delivery',
  },
  delivered: {
    label: 'Delivered',
    labelFr: 'Livrée',
    color: 'text-green-700',
    bgColor: 'bg-green-200',
    icon: 'CheckCircle',
    category: 'delivery',
  },
  delivery_failed: {
    label: 'Delivery Failed',
    labelFr: 'Échec livraison',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    icon: 'AlertTriangle',
    category: 'delivery',
  },
  partially_delivered: {
    label: 'Partially Delivered',
    labelFr: 'Partiellement livrée',
    color: 'text-orange-500',
    bgColor: 'bg-orange-100',
    icon: 'PackageCheck',
    category: 'delivery',
  },
  return_requested: {
    label: 'Return Requested',
    labelFr: 'Retour demandé',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    icon: 'RotateCcw',
    category: 'post_delivery',
  },
  returned: {
    label: 'Returned',
    labelFr: 'Retournée',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    icon: 'RotateCcw',
    category: 'post_delivery',
  },
  refunded: {
    label: 'Refunded',
    labelFr: 'Remboursée',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    icon: 'RefreshCw',
    category: 'terminal',
  },
  partially_refunded: {
    label: 'Partially Refunded',
    labelFr: 'Partiellement remboursée',
    color: 'text-green-500',
    bgColor: 'bg-green-100',
    icon: 'RefreshCw',
    category: 'terminal',
  },
  cancelled: {
    label: 'Cancelled',
    labelFr: 'Annulée',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    icon: 'XCircle',
    category: 'terminal',
  },
  archived: {
    label: 'Archived',
    labelFr: 'Archivée',
    color: 'text-gray-400',
    bgColor: 'bg-gray-50',
    icon: 'Archive',
    category: 'terminal',
  },
};

export const ANOMALY_SEVERITY_CONFIG: Record<
  AnomalySeverity,
  {
    label: string;
    labelFr: string;
    color: string;
    bgColor: string;
  }
> = {
  low: {
    label: 'Low',
    labelFr: 'Faible',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  medium: {
    label: 'Medium',
    labelFr: 'Moyen',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
  },
  high: {
    label: 'High',
    labelFr: 'Élevé',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  critical: {
    label: 'Critical',
    labelFr: 'Critique',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
};

export const ANOMALY_TYPE_CONFIG: Record<
  AnomalyType,
  {
    label: string;
    labelFr: string;
    icon: string;
  }
> = {
  payment: { label: 'Payment', labelFr: 'Paiement', icon: 'CreditCard' },
  stock: { label: 'Stock', labelFr: 'Stock', icon: 'Package' },
  delivery: { label: 'Delivery', labelFr: 'Livraison', icon: 'Truck' },
  fraud: { label: 'Fraud', labelFr: 'Fraude', icon: 'Shield' },
  technical: { label: 'Technical', labelFr: 'Technique', icon: 'AlertCircle' },
  customer: { label: 'Customer', labelFr: 'Client', icon: 'User' },
  carrier: { label: 'Carrier', labelFr: 'Transporteur', icon: 'Navigation' },
};
