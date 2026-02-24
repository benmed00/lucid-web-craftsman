import { useEffect } from 'react';

interface PreloadManagerProps {
  children?: React.ReactNode;
}

export const PreloadManager = ({ children }: PreloadManagerProps) => {
  useEffect(() => {
    // DNS prefetch for external resources
    const prefetchDomains = [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
    ];

    prefetchDomains.forEach((domain) => {
      if (
        !document.querySelector(`link[rel="dns-prefetch"][href*="${domain}"]`)
      ) {
        const link = document.createElement('link');
        link.rel = 'dns-prefetch';
        link.href = domain;
        document.head.appendChild(link);
      }
    });

    // Preload critical fonts with proper 'as' attribute
    const criticalFonts = [
      'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2',
    ];

    criticalFonts.forEach((fontUrl) => {
      if (!document.querySelector(`link[rel="preload"][href="${fontUrl}"]`)) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = fontUrl;
        link.as = 'font';
        link.type = 'font/woff2';
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
      }
    });

    // Cleanup function to remove unused preloads after window load
    const cleanup = () => {
      const preloadLinks = document.querySelectorAll('link[rel="preload"]');
      preloadLinks.forEach((link) => {
        const href = (link as HTMLLinkElement).href;
        if (
          !document.querySelector(`link[href="${href}"]:not([rel="preload"])`)
        ) {
          // Check if the resource is actually being used
          const isUsed = document.querySelector(
            `[src="${href}"], [href="${href}"]`
          );
          if (!isUsed) {
            setTimeout(() => {
              link.remove();
            }, 5000); // Remove after 5 seconds if not used
          }
        }
      });
    };

    window.addEventListener('load', cleanup);
    return () => window.removeEventListener('load', cleanup);
  }, []);

  return <>{children}</>;
};
