import { useEffect } from 'react';

// Lightweight Web Vitals tracking without excessive observers
export const useWebVitals = () => {
  useEffect(() => {
    // Throttled Web Vitals tracking - avoid excessive calls
    let vitalsReported = false;

    const reportWebVitals = () => {
      if (vitalsReported) return;
      vitalsReported = true;

      // Simple performance tracking without heavy observers
      const navigationTiming = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming;

      if (navigationTiming) {
        // Reserved for future Web Vitals reporting (navigation timing available above)
      }
    };

    // Report only once after page load
    if (document.readyState === 'complete') {
      setTimeout(reportWebVitals, 1000);
    } else {
      window.addEventListener('load', () => setTimeout(reportWebVitals, 1000));
    }
  }, []);
};
