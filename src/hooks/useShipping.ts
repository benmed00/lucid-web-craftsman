import { useState, useEffect } from 'react';
import { shippingService, ShippingCalculation, ShippingZone } from '@/services/shippingService';
import { useCurrency } from '@/stores/currencyStore';

export interface UseShippingOptions {
  postalCode?: string;
  orderAmount?: number;
  enabled?: boolean;
}

export const useShipping = (options: UseShippingOptions = {}) => {
  const [calculation, setCalculation] = useState<ShippingCalculation | null>(null);
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { formatPrice } = useCurrency();

  const { postalCode, orderAmount = 0, enabled = true } = options;

  // Calculate shipping when postal code or amount changes
  useEffect(() => {
    if (!enabled || !postalCode) {
      setCalculation(null);
      return;
    }

    const calculateShipping = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await shippingService.calculateShipping(postalCode, orderAmount);
        setCalculation(result);
      } catch (err) {
        console.error('Error calculating shipping:', err);
        setError(err instanceof Error ? err.message : 'Erreur lors du calcul de livraison');
        setCalculation(null);
      } finally {
        setLoading(false);
      }
    };

    calculateShipping();
  }, [postalCode, orderAmount, enabled]);

  // Load shipping zones
  const loadZones = async () => {
    try {
      const shippingZones = await shippingService.getShippingZones();
      setZones(shippingZones);
    } catch (err) {
      console.error('Error loading shipping zones:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des zones');
    }
  };

  // Check if postal code is in Nantes Métropole
  const isNantesMetropole = (code: string): boolean => {
    return shippingService.isNantesMetropole(code);
  };

  // Get shipping message for display
  const getShippingMessage = (): string | null => {
    if (!calculation) return null;

    const { zone, is_free, cost, delivery_estimate, savings } = calculation;

    if (is_free) {
      if (zone.name === 'Nantes Métropole') {
        return `🚚 Livraison gratuite sur la métropole Nantaise • ${delivery_estimate}`;
      } else {
        return `🚚 Livraison gratuite • ${delivery_estimate}`;
      }
    } else {
      let message = `🚚 Livraison: ${formatPrice(cost)} • ${delivery_estimate}`;
      
      if (savings && savings > 0) {
        message += ` • Plus que ${formatPrice(savings)} pour la livraison gratuite !`;
      }
      
      return message;
    }
  };

  return {
    calculation,
    zones,
    loading,
    error,
    loadZones,
    isNantesMetropole,
    getShippingMessage
  };
};