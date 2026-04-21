import { useState, useEffect, ReactNode, useMemo } from 'react';

interface ABTestWrapperProps {
  /** Unique experiment name for localStorage persistence */
  experimentId: string;
  /** Control variant (default) */
  control: ReactNode;
  /** Treatment variant */
  treatment: ReactNode;
  /** Traffic split for treatment (0-1, default 0.5) */
  trafficSplit?: number;
  /** Force a specific variant for testing */
  forceVariant?: 'control' | 'treatment';
}

/**
 * A/B Test Wrapper — deterministic, persistent variant assignment.
 * 
 * Usage:
 * ```tsx
 * <ABTestWrapper
 *   experimentId="hero-cta-v2"
 *   control={<Button>Découvrir</Button>}
 *   treatment={<Button>Voir la collection</Button>}
 *   trafficSplit={0.5}
 * />
 * ```
 */
export function ABTestWrapper({
  experimentId,
  control,
  treatment,
  trafficSplit = 0.5,
  forceVariant,
}: ABTestWrapperProps) {
  const variant = useMemo(() => {
    if (forceVariant) return forceVariant;

    const storageKey = `ab_${experimentId}`;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === 'control' || stored === 'treatment') return stored;

      const assigned = Math.random() < trafficSplit ? 'treatment' : 'control';
      localStorage.setItem(storageKey, assigned);
      return assigned;
    } catch {
      return 'control';
    }
  }, [experimentId, trafficSplit, forceVariant]);

  return <>{variant === 'treatment' ? treatment : control}</>;
}
