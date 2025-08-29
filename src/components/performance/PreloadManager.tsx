import { useEffect } from 'react';

interface PreloadManagerProps {
  children?: React.ReactNode;
}

export const PreloadManager = ({ children }: PreloadManagerProps) => {
  useEffect(() => {
    // Simple DNS prefetch for external resources (no API calls)
    const prefetchDomains = [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com'
    ];

    prefetchDomains.forEach(domain => {
      if (!document.querySelector(`link[rel="dns-prefetch"][href*="${domain}"]`)) {
        const link = document.createElement('link');
        link.rel = 'dns-prefetch';
        link.href = domain;
        document.head.appendChild(link);
      }
    });
  }, []);

  return <>{children}</>;
};