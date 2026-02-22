import { supabase } from '@/integrations/supabase/client';

export interface ShippingZone {
  id: string;
  name: string;
  postal_codes: string[];
  delivery_days_min: number;
  delivery_days_max: number;
  shipping_cost: number;
  free_shipping_threshold: number | null;
  is_active: boolean;
}

export interface ShippingCalculation {
  zone: ShippingZone;
  cost: number;
  is_free: boolean;
  delivery_estimate: string;
  savings?: number;
}

export class ShippingService {
  private static instance: ShippingService;
  private zones: ShippingZone[] = [];

  static getInstance(): ShippingService {
    if (!ShippingService.instance) {
      ShippingService.instance = new ShippingService();
    }
    return ShippingService.instance;
  }

  /**
   * Load shipping zones from database
   */
  async loadShippingZones(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('shipping_zones')
        .select('*')
        .eq('is_active', true)
        .order('delivery_days_min');

      if (error) throw error;

      this.zones = data.map((zone) => ({
        ...zone,
        postal_codes: zone.postal_codes as string[],
      }));
    } catch (error) {
      console.error('Error loading shipping zones:', error);
      this.zones = this.getDefaultZones();
    }
  }

  /**
   * Calculate shipping for a postal code and order amount
   */
  async calculateShipping(
    postalCode: string,
    orderAmount: number
  ): Promise<ShippingCalculation | null> {
    if (this.zones.length === 0) {
      await this.loadShippingZones();
    }

    const zone = this.findZoneForPostalCode(postalCode);
    if (!zone) return null;

    const isFree = this.isShippingFree(zone, orderAmount);
    const cost = isFree ? 0 : zone.shipping_cost;

    let savings: number | undefined;
    if (!isFree && zone.free_shipping_threshold) {
      const remaining = zone.free_shipping_threshold - orderAmount;
      if (remaining > 0) {
        savings = remaining;
      }
    }

    return {
      zone,
      cost,
      is_free: isFree,
      delivery_estimate: this.getDeliveryEstimate(zone),
      savings,
    };
  }

  /**
   * Get shipping zones for admin management
   */
  async getShippingZones(): Promise<ShippingZone[]> {
    if (this.zones.length === 0) {
      await this.loadShippingZones();
    }
    return this.zones;
  }

  /**
   * Check if postal code is in Nantes Métropole
   */
  isNantesMetropole(postalCode: string): boolean {
    const nantesZone = this.zones.find(
      (zone) => zone.name === 'Nantes Métropole'
    );
    if (!nantesZone) return false;

    return nantesZone.postal_codes.some((code) =>
      this.isPostalCodeInRange(postalCode, code)
    );
  }

  /**
   * Find shipping zone for a postal code
   */
  private findZoneForPostalCode(postalCode: string): ShippingZone | null {
    // Check specific zones first (like Nantes Métropole)
    for (const zone of this.zones) {
      if (zone.name === 'Nantes Métropole') {
        if (
          zone.postal_codes.some((code) =>
            this.isPostalCodeInRange(postalCode, code)
          )
        ) {
          return zone;
        }
      }
    }

    // Check other zones
    for (const zone of this.zones) {
      if (zone.name !== 'Nantes Métropole') {
        if (
          zone.postal_codes.some((code) =>
            this.isPostalCodeInRange(postalCode, code)
          )
        ) {
          return zone;
        }
      }
    }

    return null;
  }

  /**
   * Check if postal code matches a range or specific code
   */
  private isPostalCodeInRange(postalCode: string, range: string): boolean {
    if (range.includes('-')) {
      // Handle ranges like "01000-95999"
      const [start, end] = range.split('-');
      const code = parseInt(postalCode.substring(0, 5));
      const startCode = parseInt(start);
      const endCode = parseInt(end);
      return code >= startCode && code <= endCode;
    } else {
      // Exact match for specific codes
      return postalCode.startsWith(range);
    }
  }

  /**
   * Check if shipping is free for this zone and amount
   */
  private isShippingFree(zone: ShippingZone, orderAmount: number): boolean {
    if (zone.free_shipping_threshold === null) {
      return zone.shipping_cost === 0; // Always free (like Nantes)
    }
    return orderAmount >= zone.free_shipping_threshold;
  }

  /**
   * Get delivery time estimate as readable string
   */
  private getDeliveryEstimate(zone: ShippingZone): string {
    if (zone.delivery_days_min === zone.delivery_days_max) {
      return `${zone.delivery_days_min} jour${zone.delivery_days_min > 1 ? 's' : ''}`;
    }
    return `${zone.delivery_days_min}-${zone.delivery_days_max} jours`;
  }

  /**
   * Default zones in case database fetch fails
   */
  private getDefaultZones(): ShippingZone[] {
    return [
      {
        id: '1',
        name: 'Nantes Métropole',
        postal_codes: [
          '44000',
          '44100',
          '44200',
          '44300',
          '44400',
          '44470',
          '44800',
          '44900',
        ],
        delivery_days_min: 1,
        delivery_days_max: 2,
        shipping_cost: 0,
        free_shipping_threshold: 0,
        is_active: true,
      },
      {
        id: '2',
        name: 'France Métropolitaine',
        postal_codes: ['01000-95999'],
        delivery_days_min: 2,
        delivery_days_max: 5,
        shipping_cost: 6.95,
        free_shipping_threshold: 80,
        is_active: true,
      },
    ];
  }
}

// Export singleton instance
export const shippingService = ShippingService.getInstance();
