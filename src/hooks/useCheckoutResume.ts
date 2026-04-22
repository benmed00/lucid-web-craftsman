// Hook to check if there's a pending checkout session to resume
import { useState, useEffect } from 'react';
import { safeGetItem } from '@/lib/storage/safeStorage';
import { getCheckoutStorageKeys } from '@/lib/checkout/checkoutStorageKeys';

interface CheckoutResumeInfo {
  hasPendingCheckout: boolean;
  savedStep: number;
  isExpired: boolean;
}

export function useCheckoutResume(): CheckoutResumeInfo {
  const [info, setInfo] = useState<CheckoutResumeInfo>({
    hasPendingCheckout: false,
    savedStep: 1,
    isExpired: false,
  });

  useEffect(() => {
    const scanBucket = (elevated: boolean) => {
      const k = getCheckoutStorageKeys(elevated);
      const timestamp = safeGetItem<number>(k.timestamp, {
        storage: 'localStorage',
      });
      const isExpired =
        !timestamp || Date.now() - timestamp > 24 * 60 * 60 * 1000;
      const savedStep = safeGetItem<number>(k.step, {
        storage: 'localStorage',
      });
      const savedFormData = safeGetItem<Record<string, string>>(k.form, {
        storage: 'localStorage',
      });
      const hasFormData =
        savedFormData &&
        (savedFormData.firstName ||
          savedFormData.lastName ||
          savedFormData.email ||
          savedFormData.address);
      const hasPendingCheckout =
        !isExpired && !!hasFormData && (savedStep || 1) >= 1;
      return { hasPendingCheckout, savedStep: savedStep || 1, isExpired };
    };

    const std = scanBucket(false);
    const el = scanBucket(true);
    const pick = std.hasPendingCheckout ? std : el;

    setInfo({
      hasPendingCheckout: std.hasPendingCheckout || el.hasPendingCheckout,
      savedStep: pick.savedStep,
      isExpired: pick.isExpired,
    });
  }, []);

  return info;
}
