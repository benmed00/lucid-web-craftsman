// Performance monitoring utilities for Core Web Vitals

export interface WebVitalsMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

// Core Web Vitals thresholds
const THRESHOLDS = {
  CLS: { good: 0.1, poor: 0.25 },
  FID: { good: 100, poor: 300 },
  LCP: { good: 2500, poor: 4000 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 }
};

const getRating = (metricName: string, value: number): 'good' | 'needs-improvement' | 'poor' => {
  const threshold = THRESHOLDS[metricName as keyof typeof THRESHOLDS];
  if (!threshold) return 'good';
  
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
};

export const trackWebVital = (metric: { name: string; value: number }) => {
  const webVitalMetric: WebVitalsMetric = {
    name: metric.name,
    value: metric.value,
    rating: getRating(metric.name, metric.value),
    timestamp: Date.now()
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Web Vital:', webVitalMetric);
  }

  // Store in sessionStorage for analysis
  try {
    const existingMetrics = JSON.parse(sessionStorage.getItem('webVitals') || '[]');
    existingMetrics.push(webVitalMetric);
    
    // Keep only last 50 metrics
    if (existingMetrics.length > 50) {
      existingMetrics.splice(0, existingMetrics.length - 50);
    }
    
    sessionStorage.setItem('webVitals', JSON.stringify(existingMetrics));
  } catch (error) {
    console.warn('Could not store web vital metric:', error);
  }

  // Send to analytics if poor performance
  if (webVitalMetric.rating === 'poor') {
    reportToAnalytics(webVitalMetric);
  }
};

const reportToAnalytics = (metric: WebVitalsMetric) => {
  // In a real app, you would send this to your analytics service
  console.warn('Poor Web Vital detected:', metric);
  
  // Example: Send to Google Analytics 4
  if (typeof window !== 'undefined' && 'gtag' in window) {
    const gtag = (window as any).gtag;
    gtag('event', metric.name, {
      event_category: 'Web Vitals',
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      custom_parameter_1: metric.rating,
    });
  }
};

export const getWebVitalsReport = (): WebVitalsMetric[] => {
  try {
    return JSON.parse(sessionStorage.getItem('webVitals') || '[]');
  } catch {
    return [];
  }
};

export const clearWebVitalsData = () => {
  sessionStorage.removeItem('webVitals');
};

// Performance observer for additional metrics
export const observePerformance = () => {
  if (!('PerformanceObserver' in window)) return;

  // Observe navigation timing
  try {
    const navigationObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming;
          
          // Track custom metrics
          trackWebVital({
            name: 'TTFB',
            value: navEntry.responseStart - navEntry.fetchStart
          });
          
          trackWebVital({
            name: 'DOM_LOAD',
            value: navEntry.domContentLoadedEventEnd - navEntry.fetchStart
          });
        }
      }
    });
    
    navigationObserver.observe({ entryTypes: ['navigation'] });
  } catch (error) {
    console.warn('Navigation timing observation failed:', error);
  }

  // Observe long tasks
  try {
    const longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          console.warn('Long task detected:', entry.duration + 'ms');
        }
      }
    });
    
    longTaskObserver.observe({ entryTypes: ['longtask'] });
  } catch (error) {
    console.warn('Long task observation not supported');
  }
};
