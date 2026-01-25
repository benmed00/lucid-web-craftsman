import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature, x-webhook-id, x-webhook-timestamp",
};

// Helper logging function
const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CARRIER-WEBHOOK] ${step}${detailsStr}`);
};

// Carrier type definitions
interface CarrierEvent {
  carrier: 'dhl' | 'colissimo' | 'ups' | 'fedex' | 'chronopost' | 'mondialrelay' | 'generic';
  event_type: string;
  tracking_number: string;
  status: string;
  timestamp: string;
  location?: string;
  details?: string;
  raw_payload?: unknown;
}

// Map carrier-specific events to our order statuses
type OrderStatus = 
  | 'shipped'
  | 'in_transit'
  | 'delivered'
  | 'delivery_failed'
  | 'returned';

interface StatusMapping {
  status: OrderStatus;
  createAnomaly?: boolean;
  anomalyType?: 'delivery' | 'carrier';
  anomalySeverity?: 'low' | 'medium' | 'high' | 'critical';
  anomalyTitle?: string;
}

function mapDHLEvent(eventCode: string): StatusMapping | null {
  const mappings: Record<string, StatusMapping> = {
    'PU': { status: 'shipped' }, // Picked up
    'DF': { status: 'in_transit' }, // Departed facility
    'AR': { status: 'in_transit' }, // Arrived at facility
    'WC': { status: 'in_transit' }, // With delivery courier
    'OK': { status: 'delivered' }, // Delivered
    'CA': { 
      status: 'delivery_failed', 
      createAnomaly: true, 
      anomalyType: 'delivery',
      anomalySeverity: 'high',
      anomalyTitle: 'DHL: Delivery failed'
    },
    'NH': { 
      status: 'delivery_failed',
      createAnomaly: true,
      anomalyType: 'delivery', 
      anomalySeverity: 'medium',
      anomalyTitle: 'DHL: No one home'
    },
    'RT': { status: 'returned' }, // Returned to shipper
  };
  return mappings[eventCode] || null;
}

function mapColissimoEvent(eventCode: string): StatusMapping | null {
  const mappings: Record<string, StatusMapping> = {
    'PRIS_EN_CHARGE': { status: 'shipped' },
    'EN_COURS_ACHEMINEMENT': { status: 'in_transit' },
    'EN_LIVRAISON': { status: 'in_transit' },
    'LIVRE': { status: 'delivered' },
    'AVISEE': {
      status: 'delivery_failed',
      createAnomaly: true,
      anomalyType: 'delivery',
      anomalySeverity: 'medium',
      anomalyTitle: 'Colissimo: Delivery notice left'
    },
    'NON_DISTRIBUABLE': {
      status: 'delivery_failed',
      createAnomaly: true,
      anomalyType: 'delivery',
      anomalySeverity: 'high',
      anomalyTitle: 'Colissimo: Cannot deliver'
    },
    'RETOUR_EXPEDITEUR': { status: 'returned' },
  };
  return mappings[eventCode] || null;
}

function mapChronopostEvent(eventCode: string): StatusMapping | null {
  const mappings: Record<string, StatusMapping> = {
    'ENLEVE': { status: 'shipped' },
    'EN_COURS': { status: 'in_transit' },
    'EN_LIVRAISON': { status: 'in_transit' },
    'LIVRE': { status: 'delivered' },
    'INCIDENT': {
      status: 'delivery_failed',
      createAnomaly: true,
      anomalyType: 'carrier',
      anomalySeverity: 'high',
      anomalyTitle: 'Chronopost: Delivery incident'
    },
    'RETOUR': { status: 'returned' },
  };
  return mappings[eventCode] || null;
}

function mapGenericEvent(status: string): StatusMapping | null {
  const normalizedStatus = status.toLowerCase();
  
  if (normalizedStatus.includes('picked') || normalizedStatus.includes('shipped')) {
    return { status: 'shipped' };
  }
  if (normalizedStatus.includes('transit') || normalizedStatus.includes('out for delivery')) {
    return { status: 'in_transit' };
  }
  if (normalizedStatus.includes('delivered')) {
    return { status: 'delivered' };
  }
  if (normalizedStatus.includes('failed') || normalizedStatus.includes('exception')) {
    return {
      status: 'delivery_failed',
      createAnomaly: true,
      anomalyType: 'delivery',
      anomalySeverity: 'high',
      anomalyTitle: 'Delivery failed'
    };
  }
  if (normalizedStatus.includes('return')) {
    return { status: 'returned' };
  }
  
  return null;
}

function parseCarrierWebhook(carrier: string, body: unknown): CarrierEvent | null {
  const payload = body as Record<string, unknown>;
  
  switch (carrier.toLowerCase()) {
    case 'dhl': {
      // DHL Shipment Tracking API format
      const shipment = (payload.shipments as unknown[])?.[0] as Record<string, unknown> | undefined;
      const event = (shipment?.events as unknown[])?.[0] as Record<string, unknown> | undefined;
      if (!shipment || !event) return null;
      
      return {
        carrier: 'dhl',
        event_type: event.typeCode as string || 'unknown',
        tracking_number: shipment.id as string || '',
        status: event.description as string || '',
        timestamp: event.date as string || new Date().toISOString(),
        location: (event.serviceArea as Record<string, unknown>)?.description as string || undefined,
        details: event.description as string || undefined,
        raw_payload: payload,
      };
    }
    
    case 'colissimo': {
      // Colissimo format
      const evt = payload.event as Record<string, unknown> | undefined;
      return {
        carrier: 'colissimo',
        event_type: evt?.code as string || payload.eventCode as string || 'unknown',
        tracking_number: payload.parcelnumber as string || payload.trackingNumber as string || '',
        status: evt?.label as string || payload.status as string || '',
        timestamp: evt?.date as string || payload.timestamp as string || new Date().toISOString(),
        location: payload.location as string || undefined,
        raw_payload: payload,
      };
    }
    
    case 'chronopost': {
      return {
        carrier: 'chronopost',
        event_type: payload.eventCode as string || payload.code as string || 'unknown',
        tracking_number: payload.trackingNumber as string || payload.skybillNumber as string || '',
        status: payload.eventLabel as string || payload.label as string || '',
        timestamp: payload.eventDate as string || new Date().toISOString(),
        location: payload.location as string || undefined,
        raw_payload: payload,
      };
    }
    
    case 'mondialrelay': {
      return {
        carrier: 'mondialrelay',
        event_type: payload.Stat as string || 'unknown',
        tracking_number: payload.ExpeditionNum as string || '',
        status: payload.Libelle as string || '',
        timestamp: payload.Date as string || new Date().toISOString(),
        raw_payload: payload,
      };
    }
    
    default: {
      // Generic format
      return {
        carrier: 'generic',
        event_type: payload.event_type as string || payload.eventType as string || 'unknown',
        tracking_number: payload.tracking_number as string || payload.trackingNumber as string || '',
        status: payload.status as string || '',
        timestamp: payload.timestamp as string || new Date().toISOString(),
        location: payload.location as string || undefined,
        details: payload.details as string || payload.description as string || undefined,
        raw_payload: payload,
      };
    }
  }
}

function getStatusMapping(event: CarrierEvent): StatusMapping | null {
  switch (event.carrier) {
    case 'dhl':
      return mapDHLEvent(event.event_type);
    case 'colissimo':
      return mapColissimoEvent(event.event_type);
    case 'chronopost':
      return mapChronopostEvent(event.event_type);
    default:
      return mapGenericEvent(event.status);
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseService = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Webhook received");
    
    // Extract carrier from URL path or header
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const carrier = pathParts[pathParts.length - 1] || req.headers.get('x-carrier') || 'generic';
    
    logStep("Carrier identified", { carrier });
    
    // Parse request body
    const body = await req.json();
    logStep("Payload received", { body });
    
    // Parse carrier-specific format
    const event = parseCarrierWebhook(carrier, body);
    
    if (!event || !event.tracking_number) {
      logStep("Could not parse webhook or missing tracking number");
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Invalid webhook payload or missing tracking number" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    
    logStep("Event parsed", event);
    
    // Find order by tracking number
    const { data: order, error: orderError } = await supabaseService
      .from('orders')
      .select('id, order_status, user_id, carrier')
      .eq('tracking_number', event.tracking_number)
      .maybeSingle();
    
    if (orderError) {
      logStep("Database error", { error: orderError });
      throw new Error(`Database error: ${orderError.message}`);
    }
    
    if (!order) {
      logStep("Order not found for tracking number", { tracking: event.tracking_number });
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Order not found for this tracking number" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }
    
    logStep("Order found", { orderId: order.id, currentStatus: order.order_status });
    
    // Map carrier event to our status
    const mapping = getStatusMapping(event);
    
    if (!mapping) {
      logStep("No status mapping for event", { eventType: event.event_type });
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Event received but no status update needed",
        event_type: event.event_type
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    logStep("Status mapping found", mapping);
    
    // Update order status
    const updateData: Record<string, unknown> = {
      order_status: mapping.status,
      updated_at: new Date().toISOString(),
    };
    
    // Set actual delivery date if delivered
    if (mapping.status === 'delivered') {
      updateData.actual_delivery = event.timestamp;
    }
    
    const { error: updateError } = await supabaseService
      .from('orders')
      .update(updateData)
      .eq('id', order.id);
    
    if (updateError) {
      logStep("Error updating order", { error: updateError });
      throw new Error(`Failed to update order: ${updateError.message}`);
    }
    
    logStep("Order status updated", { newStatus: mapping.status });
    
    // Log status change in history
    await supabaseService
      .from('order_status_history')
      .insert({
        order_id: order.id,
        previous_status: order.order_status,
        new_status: mapping.status,
        changed_by: 'webhook',
        reason_code: `CARRIER_${event.carrier.toUpperCase()}_${event.event_type}`,
        reason_message: event.status || event.details,
        metadata: {
          carrier: event.carrier,
          event_type: event.event_type,
          location: event.location,
          timestamp: event.timestamp,
        }
      });
    
    // Create anomaly if needed
    if (mapping.createAnomaly) {
      const { error: anomalyError } = await supabaseService
        .from('order_anomalies')
        .insert({
          order_id: order.id,
          anomaly_type: mapping.anomalyType || 'delivery',
          severity: mapping.anomalySeverity || 'medium',
          title: mapping.anomalyTitle || 'Delivery issue',
          description: `${event.carrier.toUpperCase()}: ${event.status}${event.location ? ` - ${event.location}` : ''}`,
          detected_by: 'webhook',
          metadata: {
            carrier: event.carrier,
            event_type: event.event_type,
            tracking_number: event.tracking_number,
            location: event.location,
            raw_event: event.raw_payload,
          }
        });
      
      if (!anomalyError) {
        // Update order anomaly flags
        await supabaseService
          .from('orders')
          .update({
            has_anomaly: true,
            anomaly_count: (order as Record<string, number>).anomaly_count ? (order as Record<string, number>).anomaly_count + 1 : 1,
            requires_attention: mapping.anomalySeverity === 'high' || mapping.anomalySeverity === 'critical',
            attention_reason: mapping.anomalyTitle,
          })
          .eq('id', order.id);
        
        logStep("Anomaly created", { title: mapping.anomalyTitle });
      }
    }
    
    // Send notification email for significant events
    if (['delivered', 'delivery_failed'].includes(mapping.status)) {
      try {
        const functionName = mapping.status === 'delivered' 
          ? 'send-delivery-confirmation' 
          : 'send-shipping-notification';
        
        await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/${functionName}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
            },
            body: JSON.stringify({ orderId: order.id })
          }
        );
        logStep("Notification email triggered", { function: functionName });
      } catch (emailError) {
        logStep("Warning: Could not send notification email", { 
          error: (emailError as Error).message 
        });
      }
    }
    
    logStep("Webhook processing completed successfully");
    
    return new Response(JSON.stringify({ 
      success: true,
      order_id: order.id,
      previous_status: order.order_status,
      new_status: mapping.status,
      carrier: event.carrier,
      anomaly_created: mapping.createAnomaly || false
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in carrier-webhook", { message: errorMessage });
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
