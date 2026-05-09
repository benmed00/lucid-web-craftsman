/**
 * Globals not declared in `vite-env.d.ts` / vendor typings.
 */
/// <reference lib="dom" />
export {};

declare global {
  interface Window {
    STRIPE_PUBLIC_KEY?: string;
    /** Set by external tooling; guards duplicate React roots */
    __LOVABLE_LOGOUT?: boolean;
    /** Prioritized Task Scheduling API (Chromium). */
    scheduler?: {
      postTask(callback: () => void, options?: { priority?: string }): void;
    };
    /** Apple Pay JS (availability probe only in storefront). */
    ApplePaySession?: { canMakePayments(): boolean };
    google?: GooglePaymentsRoot;
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }

  interface Navigator {
    /** iOS Safari standalone PWA */
    standalone?: boolean;
  }
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
}
