/// <reference types="vite/client" />

// Apple Pay API types
declare global {
  interface Window {
    ApplePaySession?: any;
    google?: {
      payments?: {
        api?: {
          PaymentsClient: any;
        }
      }
    };
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

declare let ApplePaySession: any;
declare let google: any;
