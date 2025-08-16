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

declare var ApplePaySession: any;
declare var google: any;
