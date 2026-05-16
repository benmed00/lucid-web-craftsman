import { useCallback, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { toast } from 'sonner';
import type { TFunction } from 'i18next';

import type { CheckoutFormData } from '@/hooks/useCheckoutFormPersistence';
import type { CartItemSnapshot } from '@/hooks/useCheckoutSession';
import {
  validateCustomerInfo,
  validateShippingAddress,
} from '@/utils/checkoutValidation';

import type { CheckoutCartLine } from './checkoutPageTotals';

interface UseCheckoutStepNavigationParams {
  t: TFunction<'checkout'>;
  step: number;
  setStep: Dispatch<SetStateAction<number>>;
  honeypot: string;
  promoError: string;
  formData: CheckoutFormData;
  setFormData: Dispatch<SetStateAction<CheckoutFormData>>;
  setFormErrors: Dispatch<SetStateAction<Record<string, string>>>;
  setPromoCode: Dispatch<SetStateAction<string>>;
  setPromoError: Dispatch<SetStateAction<string>>;
  completedSteps: number[];
  setCompletedSteps: Dispatch<SetStateAction<number[]>>;
  cartItems: CheckoutCartLine[];
  subtotal: number;
  shipping: number;
  total: number;
  saveStepState: (step: number, completedSteps: number[]) => void;
  savePersonalInfo: (data: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  }) => Promise<void>;
  saveShippingInfo: (data: {
    address_line1: string;
    address_line2?: string;
    postal_code: string;
    city: string;
    country: string;
  }) => Promise<void>;
  saveCartSnapshot: (
    items: CartItemSnapshot[],
    subtotal: number,
    shipping: number,
    total: number
  ) => Promise<void>;
  updateStep: (
    currentStep: number,
    lastCompletedStep: number
  ) => Promise<void>;
}

export function useCheckoutStepNavigation({
  t,
  step,
  setStep,
  honeypot,
  promoError,
  formData,
  setFormData,
  setFormErrors,
  setPromoCode,
  setPromoError,
  completedSteps,
  setCompletedSteps,
  cartItems,
  subtotal,
  shipping,
  total,
  saveStepState,
  savePersonalInfo,
  saveShippingInfo,
  saveCartSnapshot,
  updateStep,
}: UseCheckoutStepNavigationParams) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  const goToNextStep = useCallback(() => {
    setFormErrors({});
    if (honeypot) {
      console.warn('Bot detected');
      toast.error(t('errors.genericError'));
      return;
    }

    let newCompletedSteps = [...completedSteps];

    if (step === 1) {
      const v = validateCustomerInfo({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone || undefined,
      });
      if (!v.success) {
        setFormErrors(v.errors || {});
        toast.error(
          Object.values(v.errors || {})[0] || t('errors.requiredField')
        );
        return;
      }
      const s = {
        firstName: v.data!.firstName,
        lastName: v.data!.lastName,
        email: v.data!.email,
        phone: v.data!.phone || '',
      };
      setFormData((prev) => ({ ...prev, ...s }));
      void savePersonalInfo({
        first_name: s.firstName,
        last_name: s.lastName,
        email: s.email,
        phone: s.phone || undefined,
      });
      if (!newCompletedSteps.includes(1))
        newCompletedSteps = [...newCompletedSteps, 1];
      setCompletedSteps(newCompletedSteps);
    } else if (step === 2) {
      const v = validateShippingAddress({
        address: formData.address,
        addressComplement: formData.addressComplement || undefined,
        postalCode: formData.postalCode,
        city: formData.city,
        country: formData.country,
      });
      if (!v.success) {
        setFormErrors(v.errors || {});
        toast.error(
          Object.values(v.errors || {})[0] || t('errors.requiredField')
        );
        return;
      }
      const s = {
        address: v.data!.address,
        addressComplement: v.data!.addressComplement || '',
        postalCode: v.data!.postalCode,
        city: v.data!.city,
        country: v.data!.country,
      };
      setFormData((prev) => ({ ...prev, ...s }));
      void saveShippingInfo({
        address_line1: s.address,
        address_line2: s.addressComplement || undefined,
        postal_code: s.postalCode,
        city: s.city,
        country: s.country,
      });
      const cartSnapshot: CartItemSnapshot[] = cartItems.map((item) => ({
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: Math.round(item.product.price * 100),
        total_price: Math.round(item.product.price * item.quantity * 100),
      }));
      void saveCartSnapshot(
        cartSnapshot,
        Math.round(subtotal * 100),
        Math.round(shipping * 100),
        Math.round(total * 100)
      );
      if (!newCompletedSteps.includes(2))
        newCompletedSteps = [...newCompletedSteps, 2];
      setCompletedSteps(newCompletedSteps);
    }

    const nextStep = step + 1;
    setStep(nextStep);
    saveStepState(nextStep, newCompletedSteps);
    if (promoError) {
      setPromoCode('');
      setPromoError('');
    }
    void updateStep(nextStep, Math.max(...newCompletedSteps, 0));
  }, [
    step,
    setStep,
    formData,
    honeypot,
    completedSteps,
    promoError,
    saveStepState,
    savePersonalInfo,
    saveShippingInfo,
    saveCartSnapshot,
    updateStep,
    cartItems,
    subtotal,
    shipping,
    total,
    t,
    setFormData,
    setCompletedSteps,
    setPromoCode,
    setPromoError,
    setFormErrors,
  ]);

  const handleEditStep = useCallback(
    (targetStep: number) => {
      const n = completedSteps.filter((s) => s < targetStep);
      setCompletedSteps(n);
      setStep(targetStep);
      saveStepState(targetStep, n);
    },
    [completedSteps, saveStepState, setCompletedSteps, setStep]
  );

  return { goToNextStep, handleEditStep };
}
