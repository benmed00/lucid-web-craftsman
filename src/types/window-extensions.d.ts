/**
 * Globals not declared in `vite-env.d.ts` / vendor typings.
 */
/// <reference lib="dom" />
export {};

/** Apple Pay JS — constructor + session (storefront probes + `new ApplePaySession`). */
interface ApplePaySessionGlobal {
  new (version: number, paymentRequest: unknown): ApplePaySessionPayment;
  readonly STATUS_SUCCESS: number;
  canMakePayments(): boolean;
}

interface ApplePaySessionPayment {
  begin(): void;
  completePayment(status: number): void;
  onvalidatemerchant?: ((event: unknown) => void) | null;
  onpaymentauthorized?: ((event: unknown) => void) | null;
}

declare global {
  interface Window {
    STRIPE_PUBLIC_KEY?: string;
    /** Set by external tooling; guards duplicate React roots */
    __LOVABLE_LOGOUT?: boolean;
    /** Prioritized Task Scheduling API (Chromium). */
    scheduler?: {
      postTask(callback: () => void, options?: { priority?: string }): void;
    };
    /** Apple Pay JS */
    ApplePaySession?: ApplePaySessionGlobal;
    google?: GooglePaymentsRoot;
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }

  interface Navigator {
    /** iOS Safari standalone PWA */
    standalone?: boolean;
  }

  /** Global `ApplePaySession` binding (Safari; same object as `window.ApplePaySession`). */
  var ApplePaySession: ApplePaySessionGlobal;

  /** Google Pay — global alias used alongside `window.google`. */
  var google: GooglePaymentsRoot;
}

interface GooglePaymentsRoot {
  payments?: {
    api?: {
      PaymentsClient: new (options: {
        environment: string;
      }) => GooglePaymentsClient;
    };
  };
}

interface GooglePaymentsClient {
  isReadyToPay(request: unknown): Promise<{ result?: boolean }>;
  loadPaymentData(request: unknown): Promise<unknown>;
}
