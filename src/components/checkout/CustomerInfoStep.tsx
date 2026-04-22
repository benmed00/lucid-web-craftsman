/**
 * @file CustomerInfoStep.tsx
 * @module src/components/checkout/CustomerInfoStep
 *
 * @summary
 * Checkout wizard step 1 UI: customer identity and contact fields (given name,
 * family name, email, optional phone). Renders inside the checkout page’s step
 * flow; advances to shipping when the user confirms via the primary action.
 *
 * @description
 * - **Parent integration:** Consumed by the checkout page (see `Checkout.tsx` /
 *   `useCheckoutPage`) which owns form state, server-side validation, and step
 *   transitions. This component is presentational: it forwards edits through
 *   callbacks and does not submit orders or call APIs.
 * - **State management (this file vs parent):** All durable checkout form fields,
 *   `formErrors`, and `honeypot` are controlled from `useCheckoutPage` (backed by
 *   `useCheckoutFormPersistence` / session APIs). This step has no local `useState`
 *   for form values. `Checkout.tsx` gates visibility with `step === 1` and shows
 *   skeletons until `hasRestoredState`. Advancing steps, completed-step markers,
 *   and persistence hooks run only in the parent when `onNext` runs successfully.
 * - **Notifications & modal communication:** This component does **not** call
 *   `toast`, dialog APIs, or global modals. User-visible notifications for step 1
 *   are fired in `useCheckoutPage.goToNextStep`: e.g. Sonner `toast.error` when the
 *   honeypot is non-empty (treated as bot traffic; generic error copy) or when
 *   `validateCustomerInfo` fails (first validation message). Success toasts for
 *   unrelated flows (e.g. promo applied) live in the same hook / summary, not here.
 *   If you add in-step alerts, prefer lifting them to the hook or a shared
 *   checkout provider so this file stays a thin view.
 * - **Errors & misbehaviour handling:** (1) **Inline / blur:** `FormFieldWithValidation`
 *   runs `validate` on blur and shows field-level errors locally; required empty
 *   fields use the shared checkout namespace. (2) **On continue:** Parent clears
 *   errors then runs honeypot check, then `validateCustomerInfo` (see
 *   `@/utils/checkoutValidation`); failures set `formErrors` and show `toast.error`
 *   without changing step. (3) **Recovery:** `onClearError` removes a parent-held
 *   error when the user edits that field so stale server-side messages disappear.
 *   (4) **Honeypot:** Filling the hidden field does not surface an inline error in
 *   this UI; parent blocks navigation and shows a toast only.
 * - **Internationalization:** Copy for labels, placeholders, step title, button,
 *   and validation messages comes from the `checkout` i18next namespace
 *   (`useTranslation('checkout')`). The privacy line below the legend is
 *   currently hardcoded in French; keep that in mind if you add locale keys.
 * - **Validation:** Each visible field uses `FormFieldWithValidation` with
 *   inline `validate` functions (length, character class, email shape, optional
 *   phone pattern). Empty phone is allowed; other fields are required at the UI
 *   level. Parent may still run `validateCustomerInfo` / full checkout validation.
 * - **Spam mitigation:** A visually hidden honeypot input (`checkout_hp_v1`) is
 *   positioned off-screen. Bots that fill every field can be detected upstream;
 *   `id`/`name` avoid common autofill tokens like `website`. Attributes
 *   `autoComplete="new-password"`, `data-1p-ignore`, `data-lpignore`, and
 *   `tabIndex={-1}` reduce accidental population by password managers and
 *   keyboard focus.
 * - **Accessibility:** Wrapped in a `<fieldset>` with `<legend>` for the step
 *   title; honeypot is `aria-hidden`; continue button uses
 *   `aria-describedby` pointing to an `sr-only` hint mirroring the shipping label.
 *
 * @dependencies
 * - `@/components/ui/button`, `@/components/ui/input` — design system primitives.
 * - `@/components/checkout/FormFieldWithValidation` — labeled input + error + success.
 * - `lucide-react` — `ArrowRight`, `ShieldCheck` icons.
 * - `react-i18next` — `useTranslation('checkout')`.
 *
 * @testing
 * - E2E: continue action is targetable via `data-testid="checkout-continue-to-shipping"`.
 *
 * @see `src/pages/Checkout.tsx` — checkout page shell that hosts this step.
 * @see `src/hooks/useCheckoutPage.ts` — step state, persistence, and `onNext` gating.
 * @see `docs/PLATFORM.md` — checkout/payment behavior, client services, isolation.
 * @see `docs/README.md` — documentation index (links to E2E, STANDARDS, Edge docs).
 * @see `docs/E2E-COVERAGE.md` — checkout Cypress specs and smoke coverage.
 * @see `supabase/functions/create-payment/DATA_FLOW.md` — Edge create-payment flow (SPA reaches it via services, not this component).
 * @see `cypress/README.md` — E2E runbook, `baseUrl`, credentials.
 */

import { type ChangeEvent, type FC } from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FormFieldWithValidation from '@/components/checkout/FormFieldWithValidation';

/**
 * Props wiring this step to `useCheckoutPage` / `Checkout.tsx`.
 *
 * Notifications and step transitions are not props: they happen inside `goToNextStep`
 * when `onNext` is invoked (toast on failure; `setStep` on success).
 */
interface CustomerInfoStepProps {
  /** Current values for the four customer fields (controlled; persisted upstream). */
  formData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  /**
   * Parent-owned errors after `validateCustomerInfo` (or cleared keys on edit).
   * Shown beside inputs; distinct from `FormFieldWithValidation`’s transient
   * blur errors, though both may appear on the same field in edge cases.
   */
  formErrors: Record<string, string>;
  /**
   * Honeypot value; must stay empty for legitimate users. Controlled by parent
   * so it can be checked before advancing or submitting checkout.
   */
  honeypot: string;
  /** Updates a single field in parent form state (typically sanitized there). */
  onFieldChange: (field: string, value: string) => void;
  /** Clears the error for a field after the user edits it. */
  onClearError: (field: string) => void;
  /** Wired to the hidden honeypot input’s `onChange`. */
  onHoneypotChange: (value: string) => void;
  /**
   * Continue: parent clears errors, checks honeypot (`toast.error` if tripped),
   * validates customer info (`toast.error` + `formErrors` on failure), then may
   * persist personal info, update completed steps, and increment `step`.
   */
  onNext: () => void;
}

/** `FormFieldWithValidation` local validator: error message or `null` when valid. */
type FieldValidator = (value: string) => string | null;

/**
 * Renders checkout step “Customer information”: name grid, email, optional phone,
 * honeypot, and navigation to shipping.
 */
const CustomerInfoStep: FC<CustomerInfoStepProps> = ({
  formData,
  formErrors,
  honeypot,
  onFieldChange,
  onClearError,
  onHoneypotChange,
  onNext,
}) => {
  const { t }: { t: TFunction<'checkout'> } = useTranslation('checkout');

  const handleHoneypotChange: (e: ChangeEvent<HTMLInputElement>) => void = (
    e: ChangeEvent<HTMLInputElement>
  ): void => {
    onHoneypotChange(e.target.value);
  };

  const handleFirstNameChange: (value: string) => void = (
    value: string
  ): void => {
    onFieldChange('firstName', value);
    onClearError('firstName');
  };

  const handleLastNameChange: (value: string) => void = (
    value: string
  ): void => {
    onFieldChange('lastName', value);
    onClearError('lastName');
  };

  const handleEmailChange: (value: string) => void = (value: string): void => {
    onFieldChange('email', value);
    onClearError('email');
  };

  const handlePhoneChange: (value: string) => void = (value: string): void => {
    onFieldChange('phone', value);
    onClearError('phone');
  };

  const validateNameField: FieldValidator = (value: string): string | null => {
    if (value.length < 2) return t('errors.requiredField');
    if (!/^[a-zA-ZÀ-ÿ\s\-'.]+$/.test(value)) return t('errors.requiredField');
    return null;
  };

  const validateEmailField: FieldValidator = (value: string): string | null => {
    if (!value.includes('@')) return t('errors.invalidEmail');
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)) {
      return t('errors.invalidEmail');
    }
    return null;
  };

  const validatePhoneField: FieldValidator = (value: string): string | null => {
    if (!value) return null;
    if (!/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/.test(value)) {
      return t('errors.invalidPhone');
    }
    return null;
  };

  return (
    <fieldset className="space-y-5 animate-fade-in">
      <legend className="text-xl font-semibold text-foreground mb-2 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        {t('steps.information')}
      </legend>
      <p className="text-sm text-muted-foreground -mt-1">
        Vos informations sont protégées et ne seront jamais partagées.
      </p>

      {/*
        Honeypot: keep id/name/label free of tokens like "website" that trigger
        autofill; filled honeypots should fail validation server-side or in parent.
      */}
      <div
        className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
        aria-hidden="true"
      >
        <label htmlFor="checkout-hp-v1" className="sr-only">
          Leave blank
        </label>
        <Input
          id="checkout-hp-v1"
          name="checkout_hp_v1"
          type="text"
          tabIndex={-1}
          autoComplete="new-password"
          data-1p-ignore="true"
          data-lpignore="true"
          value={honeypot}
          onChange={handleHoneypotChange}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/*
          Names: min 2 chars; letters including Latin accents, spaces, hyphen,
          apostrophe, period (see regex). maxLength 50 aligns with typical name limits.
        */}
        <FormFieldWithValidation
          id="firstName"
          label={t('form.firstName')}
          value={formData.firstName}
          onChange={handleFirstNameChange}
          error={formErrors.firstName}
          placeholder={t('form.firstName')}
          required
          autoComplete="given-name"
          maxLength={50}
          validate={validateNameField}
        />

        <FormFieldWithValidation
          id="lastName"
          label={t('form.lastName')}
          value={formData.lastName}
          onChange={handleLastNameChange}
          error={formErrors.lastName}
          placeholder={t('form.lastName')}
          required
          autoComplete="family-name"
          maxLength={50}
          validate={validateNameField}
        />
      </div>

      {/*
        Email: basic structure check (@ present + RFC-ish local@domain.tld pattern).
        maxLength 254 matches common email column limits.
      */}
      <FormFieldWithValidation
        id="email"
        label={t('form.email')}
        type="email"
        value={formData.email}
        onChange={handleEmailChange}
        error={formErrors.email}
        placeholder="email@example.com"
        required
        autoComplete="email"
        maxLength={254}
        validate={validateEmailField}
      />

      {/*
        Phone optional; if non-empty, must match loose international digit pattern.
        Success checkmark disabled for this field (often partially filled).
      */}
      <FormFieldWithValidation
        id="phone"
        label={t('form.phone')}
        type="tel"
        value={formData.phone}
        onChange={handlePhoneChange}
        error={formErrors.phone}
        placeholder="+33 6 12 34 56 78"
        autoComplete="tel"
        maxLength={20}
        showSuccessState={false}
        validate={validatePhoneField}
      />

      <Button
        data-testid="checkout-continue-to-shipping"
        className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground gap-2 min-h-[48px] text-base font-medium shadow-sm"
        onClick={onNext}
        aria-describedby="step1-instructions"
      >
        {t('steps.shipping')}
        <ArrowRight className="h-4 w-4" />
      </Button>
      <p id="step1-instructions" className="sr-only">
        {t('steps.shipping')}
      </p>
    </fieldset>
  );
};

export default CustomerInfoStep;
