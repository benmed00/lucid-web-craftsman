import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from './pixels';

/** Tracks page views on route changes for all configured pixels. */
export function usePageTracking(): void {
  const location = useLocation();

  useEffect(() => {
    trackPageView();
  }, [location.pathname]);
}
