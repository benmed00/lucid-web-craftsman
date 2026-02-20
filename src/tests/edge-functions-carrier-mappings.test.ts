/**
 * Carrier Webhook - Status Mapping Logic Unit Tests
 *
 * These tests mirror the mapping logic in supabase/functions/carrier-webhook/index.ts.
 * They document and verify the expected behavior for carrier-specific event codes.
 */

import { describe, it, expect } from 'vitest';

// Replicate mapping logic from carrier-webhook for unit testing
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
    PU: { status: 'shipped' },
    DF: { status: 'in_transit' },
    AR: { status: 'in_transit' },
    WC: { status: 'in_transit' },
    OK: { status: 'delivered' },
    CA: {
      status: 'delivery_failed',
      createAnomaly: true,
      anomalyType: 'delivery',
      anomalySeverity: 'high',
      anomalyTitle: 'DHL: Delivery failed',
    },
    NH: {
      status: 'delivery_failed',
      createAnomaly: true,
      anomalyType: 'delivery',
      anomalySeverity: 'medium',
      anomalyTitle: 'DHL: No one home',
    },
    RT: { status: 'returned' },
  };
  return mappings[eventCode] || null;
}

function mapColissimoEvent(eventCode: string): StatusMapping | null {
  const mappings: Record<string, StatusMapping> = {
    PRIS_EN_CHARGE: { status: 'shipped' },
    EN_COURS_ACHEMINEMENT: { status: 'in_transit' },
    EN_LIVRAISON: { status: 'in_transit' },
    LIVRE: { status: 'delivered' },
    AVISEE: {
      status: 'delivery_failed',
      createAnomaly: true,
      anomalyType: 'delivery',
      anomalySeverity: 'medium',
      anomalyTitle: 'Colissimo: Delivery notice left',
    },
    NON_DISTRIBUABLE: {
      status: 'delivery_failed',
      createAnomaly: true,
      anomalyType: 'delivery',
      anomalySeverity: 'high',
      anomalyTitle: 'Colissimo: Cannot deliver',
    },
    RETOUR_EXPEDITEUR: { status: 'returned' },
  };
  return mappings[eventCode] || null;
}

function mapChronopostEvent(eventCode: string): StatusMapping | null {
  const mappings: Record<string, StatusMapping> = {
    ENLEVE: { status: 'shipped' },
    EN_COURS: { status: 'in_transit' },
    EN_LIVRAISON: { status: 'in_transit' },
    LIVRE: { status: 'delivered' },
    INCIDENT: {
      status: 'delivery_failed',
      createAnomaly: true,
      anomalyType: 'carrier',
      anomalySeverity: 'high',
      anomalyTitle: 'Chronopost: Delivery incident',
    },
    RETOUR: { status: 'returned' },
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
      anomalyTitle: 'Delivery failed',
    };
  }
  if (normalizedStatus.includes('return')) {
    return { status: 'returned' };
  }

  return null;
}

describe('carrier-webhook: DHL event mappings', () => {
  it('maps PU (Picked up) to shipped', () => {
    expect(mapDHLEvent('PU')).toEqual({ status: 'shipped' });
  });

  it('maps DF, AR, WC to in_transit', () => {
    expect(mapDHLEvent('DF')).toEqual({ status: 'in_transit' });
    expect(mapDHLEvent('AR')).toEqual({ status: 'in_transit' });
    expect(mapDHLEvent('WC')).toEqual({ status: 'in_transit' });
  });

  it('maps OK to delivered', () => {
    expect(mapDHLEvent('OK')).toEqual({ status: 'delivered' });
  });

  it('maps CA to delivery_failed with anomaly', () => {
    const result = mapDHLEvent('CA');
    expect(result?.status).toBe('delivery_failed');
    expect(result?.createAnomaly).toBe(true);
    expect(result?.anomalySeverity).toBe('high');
  });

  it('maps NH to delivery_failed with medium anomaly', () => {
    const result = mapDHLEvent('NH');
    expect(result?.status).toBe('delivery_failed');
    expect(result?.createAnomaly).toBe(true);
    expect(result?.anomalySeverity).toBe('medium');
  });

  it('maps RT to returned', () => {
    expect(mapDHLEvent('RT')).toEqual({ status: 'returned' });
  });

  it('returns null for unknown DHL codes', () => {
    expect(mapDHLEvent('XX')).toBeNull();
    expect(mapDHLEvent('')).toBeNull();
  });
});

describe('carrier-webhook: Colissimo event mappings', () => {
  it('maps PRIS_EN_CHARGE to shipped', () => {
    expect(mapColissimoEvent('PRIS_EN_CHARGE')).toEqual({ status: 'shipped' });
  });

  it('maps EN_COURS_ACHEMINEMENT and EN_LIVRAISON to in_transit', () => {
    expect(mapColissimoEvent('EN_COURS_ACHEMINEMENT')).toEqual({ status: 'in_transit' });
    expect(mapColissimoEvent('EN_LIVRAISON')).toEqual({ status: 'in_transit' });
  });

  it('maps LIVRE to delivered', () => {
    expect(mapColissimoEvent('LIVRE')).toEqual({ status: 'delivered' });
  });

  it('maps NON_DISTRIBUABLE to delivery_failed with anomaly', () => {
    const result = mapColissimoEvent('NON_DISTRIBUABLE');
    expect(result?.status).toBe('delivery_failed');
    expect(result?.createAnomaly).toBe(true);
    expect(result?.anomalyTitle).toContain('Cannot deliver');
  });

  it('maps RETOUR_EXPEDITEUR to returned', () => {
    expect(mapColissimoEvent('RETOUR_EXPEDITEUR')).toEqual({ status: 'returned' });
  });
});

describe('carrier-webhook: Chronopost event mappings', () => {
  it('maps ENLEVE to shipped', () => {
    expect(mapChronopostEvent('ENLEVE')).toEqual({ status: 'shipped' });
  });

  it('maps EN_COURS and EN_LIVRAISON to in_transit', () => {
    expect(mapChronopostEvent('EN_COURS')).toEqual({ status: 'in_transit' });
    expect(mapChronopostEvent('EN_LIVRAISON')).toEqual({ status: 'in_transit' });
  });

  it('maps LIVRE to delivered', () => {
    expect(mapChronopostEvent('LIVRE')).toEqual({ status: 'delivered' });
  });

  it('maps INCIDENT to delivery_failed with carrier anomaly', () => {
    const result = mapChronopostEvent('INCIDENT');
    expect(result?.status).toBe('delivery_failed');
    expect(result?.anomalyType).toBe('carrier');
  });

  it('maps RETOUR to returned', () => {
    expect(mapChronopostEvent('RETOUR')).toEqual({ status: 'returned' });
  });
});

describe('carrier-webhook: Generic event mappings', () => {
  it('maps picked/shipped keywords to shipped', () => {
    expect(mapGenericEvent('picked up')).toEqual({ status: 'shipped' });
    expect(mapGenericEvent('SHIPPED')).toEqual({ status: 'shipped' });
  });

  it('maps transit keywords to in_transit', () => {
    expect(mapGenericEvent('in transit')).toEqual({ status: 'in_transit' });
    expect(mapGenericEvent('out for delivery')).toEqual({ status: 'in_transit' });
  });

  it('maps delivered keyword to delivered', () => {
    expect(mapGenericEvent('delivered')).toEqual({ status: 'delivered' });
  });

  it('maps failed/exception to delivery_failed with anomaly', () => {
    const result = mapGenericEvent('delivery failed');
    expect(result?.status).toBe('delivery_failed');
    expect(result?.createAnomaly).toBe(true);
  });

  it('maps return keyword to returned', () => {
    expect(mapGenericEvent('returned to sender')).toEqual({ status: 'returned' });
  });

  it('returns null for unrecognized status', () => {
    expect(mapGenericEvent('processing')).toBeNull();
    expect(mapGenericEvent('')).toBeNull();
  });
});
