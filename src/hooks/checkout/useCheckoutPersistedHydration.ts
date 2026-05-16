import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import type { SavedCoupon } from '@/hooks/useCheckoutFormPersistence';

interface UseCheckoutPersistedHydrationParams {
  isFormLoading: boolean;
  savedStep: number;
  savedCompletedSteps: number[];
  savedCoupon: SavedCoupon | null;
  setStep: Dispatch<SetStateAction<number>>;
  setCompletedSteps: Dispatch<SetStateAction<number[]>>;
  setAppliedCoupon: Dispatch<SetStateAction<SavedCoupon | null>>;
}

/**
 * One-shot hydration from `useCheckoutFormPersistence` after loading completes:
 * restores wizard step/coupon when the user returns mid-checkout.
 */
export function useCheckoutPersistedHydration({
  isFormLoading,
  savedStep,
  savedCompletedSteps,
  savedCoupon,
  setStep,
  setCompletedSteps,
  setAppliedCoupon,
}: UseCheckoutPersistedHydrationParams) {
  const [hasRestoredState, setHasRestoredState] = useState(false);

  useEffect(() => {
    if (!isFormLoading && !hasRestoredState) {
      if (savedStep > 1 && savedCompletedSteps.length > 0) {
        setStep(savedStep);
        setCompletedSteps(savedCompletedSteps);
      }
      if (savedCoupon) setAppliedCoupon(savedCoupon);
      setHasRestoredState(true);
    }
  }, [
    isFormLoading,
    hasRestoredState,
    savedStep,
    savedCompletedSteps,
    savedCoupon,
    setStep,
    setCompletedSteps,
    setAppliedCoupon,
  ]);

  return { hasRestoredState };
}
