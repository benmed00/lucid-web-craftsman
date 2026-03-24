/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Node/Vitest only — never prefix with VITE_ or use in browser bundles */
  readonly SUPABASE_SERVICE_ROLE_KEY?: string;
  readonly VITE_PAYMENT_SUCCESS_MAX_POLLS?: string;
  readonly VITE_PAYMENT_SUCCESS_POLL_INTERVAL_MS?: string;
  readonly VITE_PAYMENT_SUCCESS_MAX_WAIT_MS?: string;
  readonly VITE_PAYMENT_SUCCESS_POLL_INITIAL_MS?: string;
  readonly VITE_PAYMENT_SUCCESS_POLL_MAX_INTERVAL_MS?: string;
  readonly VITE_PAYMENT_SUCCESS_POLL_BACKOFF_FACTOR?: string;
  readonly VITE_PAYMENT_SUCCESS_MAX_POLL_STEPS?: string;
}

// Apple Pay API types
declare global {
  interface Window {
    ApplePaySession?: any;
    google?: {
      payments?: {
        api?: {
          PaymentsClient: any;
        };
      };
    };
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

declare let ApplePaySession: any;
declare let google: any;
