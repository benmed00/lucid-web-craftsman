import { useState, useEffect, useCallback } from 'react';

interface WebVitalsMetrics {
  fcp?: number;  // First Contentful Paint
  lcp?: number;  // Largest Contentful Paint
  fid?: number;  // First Input Delay
  cls?: number;  // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte
  inp?: number;  // Interaction to Next Paint (new)
}

interface PerformanceMetrics {
  webVitals: WebVitalsMetrics;
  navigationTiming: PerformanceNavigationTiming | null;
  resourceTiming: PerformanceResourceTiming[];
  score: {
    overall: number;
    fcp: number;
    lcp: number;
    fid: number;
    cls: number;
  };
}

export const useWebVitals = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    webVitals: {},
    navigationTiming: null,
    resourceTiming: [],
    score: {
      overall: 0,
      fcp: 0,
      lcp: 0,
      fid: 0,
      cls: 0,
    }
  });

  const [isLoading, setIsLoading] = useState(true);

  // Calculate performance scores based on thresholds
  const calculateScore = useCallback((value: number, good: number, poor: number): number => {
    if (value <= good) return 100;
    if (value >= poor) return 0;
    return Math.round(100 - ((value - good) / (poor - good)) * 100);
  }, []);

  // Update scores when metrics change
  const updateScores = useCallback((webVitals: WebVitalsMetrics) => {
    const fcpScore = webVitals.fcp ? calculateScore(webVitals.fcp, 1800, 3000) : 0;
    const lcpScore = webVitals.lcp ? calculateScore(webVitals.lcp, 2500, 4000) : 0;
    const fidScore = webVitals.fid ? calculateScore(webVitals.fid, 100, 300) : 100;
    const clsScore = webVitals.cls ? calculateScore(webVitals.cls * 1000, 100, 250) : 100;

    const overall = Math.round((fcpScore + lcpScore + fidScore + clsScore) / 4);

    return {
      overall,
      fcp: fcpScore,
      lcp: lcpScore,
      fid: fidScore,
      cls: clsScore,
    };
  }, [calculateScore]);

  // Collect Web Vitals using Performance Observer
  useEffect(() => {
    const vitals: WebVitalsMetrics = {};

    // First Contentful Paint
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const fcpEntry = entries[entries.length - 1];
      if (fcpEntry) {
        vitals.fcp = fcpEntry.startTime;
        setMetrics(prev => ({
          ...prev,
          webVitals: { ...prev.webVitals, fcp: fcpEntry.startTime },
          score: updateScores({ ...prev.webVitals, fcp: fcpEntry.startTime })
        }));
      }
    });

    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lcpEntry = entries[entries.length - 1];
      if (lcpEntry) {
        vitals.lcp = lcpEntry.startTime;
        setMetrics(prev => ({
          ...prev,
          webVitals: { ...prev.webVitals, lcp: lcpEntry.startTime },
          score: updateScores({ ...prev.webVitals, lcp: lcpEntry.startTime })
        }));
      }
    });

    // First Input Delay
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (entry.processingStart && entry.startTime) {
          const fid = entry.processingStart - entry.startTime;
          vitals.fid = fid;
          setMetrics(prev => ({
            ...prev,
            webVitals: { ...prev.webVitals, fid },
            score: updateScores({ ...prev.webVitals, fid })
          }));
        }
      });
    });

    // Cumulative Layout Shift
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          vitals.cls = clsValue;
          setMetrics(prev => ({
            ...prev,
            webVitals: { ...prev.webVitals, cls: clsValue },
            score: updateScores({ ...prev.webVitals, cls: clsValue })
          }));
        }
      });
    });

    // Interaction to Next Paint (newer metric)
    const inpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (entry.duration) {
          vitals.inp = entry.duration;
          setMetrics(prev => ({
            ...prev,
            webVitals: { ...prev.webVitals, inp: entry.duration }
          }));
        }
      });
    });

    // Start observing
    try {
      fcpObserver.observe({ type: 'paint', buffered: true });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      fidObserver.observe({ type: 'first-input', buffered: true });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
      
      // INP is experimental, handle gracefully
      try {
        inpObserver.observe({ type: 'event', buffered: true });
      } catch (e) {
        console.info('INP measurement not supported');
      }
    } catch (error) {
      console.warn('Performance Observer not supported:', error);
    }

    // Get navigation timing
    const updateNavigationTiming = () => {
      const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigationEntry) {
        const ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
        setMetrics(prev => ({
          ...prev,
          navigationTiming: navigationEntry,
          webVitals: { ...prev.webVitals, ttfb }
        }));
      }
    };

    // Get resource timing
    const updateResourceTiming = () => {
      const resourceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      setMetrics(prev => ({
        ...prev,
        resourceTiming: resourceEntries
      }));
    };

    // Initial data collection
    setTimeout(() => {
      updateNavigationTiming();
      updateResourceTiming();
      setIsLoading(false);
    }, 1000);

    // Cleanup observers
    return () => {
      fcpObserver.disconnect();
      lcpObserver.disconnect();
      fidObserver.disconnect();
      clsObserver.disconnect();
      inpObserver.disconnect();
    };
  }, [updateScores]);

  // Performance analysis helpers
  const getPerformanceReport = useCallback(() => {
    const { webVitals, navigationTiming, resourceTiming, score } = metrics;
    
    const slowResources = resourceTiming
      .filter(entry => entry.duration > 500)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    const recommendations = [];

    if (webVitals.fcp && webVitals.fcp > 1800) {
      recommendations.push({
        metric: 'FCP',
        issue: 'First Contentful Paint is slow',
        solution: 'Optimize critical rendering path, reduce render-blocking resources'
      });
    }

    if (webVitals.lcp && webVitals.lcp > 2500) {
      recommendations.push({
        metric: 'LCP',
        issue: 'Largest Contentful Paint is slow',
        solution: 'Optimize images, preload key resources, improve server response time'
      });
    }

    if (webVitals.fid && webVitals.fid > 100) {
      recommendations.push({
        metric: 'FID',
        issue: 'First Input Delay is high',
        solution: 'Reduce JavaScript execution time, break up long tasks'
      });
    }

    if (webVitals.cls && webVitals.cls > 0.1) {
      recommendations.push({
        metric: 'CLS',
        issue: 'Cumulative Layout Shift is high',
        solution: 'Add size attributes to images and videos, reserve space for dynamic content'
      });
    }

    return {
      webVitals,
      navigationTiming,
      score,
      slowResources,
      recommendations,
      grade: score.overall >= 90 ? 'A' : score.overall >= 75 ? 'B' : score.overall >= 60 ? 'C' : 'D'
    };
  }, [metrics]);

  // Real-time performance monitoring
  const startRealTimeMonitoring = useCallback(() => {
    const monitoringInterval = setInterval(() => {
      // Check for performance issues
      const { webVitals } = metrics;
      
      if (webVitals.cls && webVitals.cls > 0.25) {
        console.warn('High CLS detected:', webVitals.cls);
      }
      
      if (webVitals.fid && webVitals.fid > 300) {
        console.warn('High FID detected:', webVitals.fid);
      }
    }, 5000);

    return () => clearInterval(monitoringInterval);
  }, [metrics]);

  return {
    metrics,
    isLoading,
    getPerformanceReport,
    startRealTimeMonitoring,
    updateMetrics: setMetrics
  };
};

// Utility function to format performance metrics for display
export const formatMetric = (value: number | undefined, unit: string = 'ms'): string => {
  if (value === undefined) return 'N/A';
  
  if (unit === 'ms') {
    return value < 1000 ? `${Math.round(value)}ms` : `${(value / 1000).toFixed(1)}s`;
  }
  
  if (unit === 'score') {
    return `${Math.round(value)}/100`;
  }
  
  return `${value.toFixed(3)}`;
};

export default useWebVitals;