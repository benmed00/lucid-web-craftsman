// Hook to check if there's a pending checkout session to resume
import { useState, useEffect } from 'react';
import { safeGetItem } from '@/lib/storage/safeStorage';

const CHECKOUT_FORM_KEY = 'checkout_form_data';
const CHECKOUT_STEP_KEY = 'checkout_current_step';
const CHECKOUT_TIMESTAMP_KEY = 'checkout_timestamp';

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
    // Check timestamp (30 min TTL)
    const timestamp = safeGetItem<number>(CHECKOUT_TIMESTAMP_KEY, {
      storage: 'localStorage',
    });
    const isExpired = !timestamp || Date.now() - timestamp > 30 * 60 * 1000;

    // Check for saved step
    const savedStep = safeGetItem<number>(CHECKOUT_STEP_KEY, {
      storage: 'localStorage',
    });

    // Check for saved form data
    const savedFormData = safeGetItem<Record<string, string>>(
      CHECKOUT_FORM_KEY,
      {
        storage: 'localStorage',
      }
    );

    // Has pending checkout if there's form data with meaningful content and step > 1
    const hasFormData =
      savedFormData &&
      (savedFormData.firstName ||
        savedFormData.lastName ||
        savedFormData.email ||
        savedFormData.address);

    const hasPendingCheckout =
      !isExpired && !!hasFormData && (savedStep || 1) >= 1;

    setInfo({
      hasPendingCheckout,
      savedStep: savedStep || 1,
      isExpired,
    });
  }, []);

  return info;
}
