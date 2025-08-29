import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface PreloadManagerProps {
  children: React.ReactNode;
}

// Critical resources to preload
const criticalResources = [
  // Fonts
  { href: '/fonts/inter.woff2', as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' },
  
  // Critical CSS (if any external)
  // { href: '/critical.css', as: 'style' },
  
  // Hero images
  { href: '/assets/images/home_page_image.webp', as: 'image' },
  { href: '/assets/images/handmade_products.webp', as: 'image' },
];

// Route-based preloading
const routePreloads: Record<string, Array<{ href: string; as: string; type?: string }>> = {
  '/': [
    { href: '/assets/images/produits_phares/chapeau_panama.webp', as: 'image' },
    { href: '/assets/images/produits_phares/sac_bandouliere.webp', as: 'image' },
  ],
  '/products': [
    { href: '/assets/images/products/chapeau_de_paille_berbere.jpg', as: 'image' },
    { href: '/assets/images/products/sac_a_main_tisse_traditionnel.jpg', as: 'image' },
  ],
  '/blog': [
    { href: '/assets/images/blog/tissage.jpg', as: 'image' },
    { href: '/assets/images/blog/fibre_vegetal.jpg', as: 'image' },
  ],
};

// Prefetch routes likely to be visited next
const routePrefetches: Record<string, string[]> = {
  '/': ['/products', '/blog', '/about'],
  '/products': ['/cart', '/checkout'],
  '/blog': ['/about', '/story'],
  '/product/*': ['/cart', '/products'],
};

const PreloadManager: React.FC<PreloadManagerProps> = ({ children }) => {
  const location = useLocation();

  // Preload critical resources on app start
  useEffect(() => {
    const preloadCriticalResources = () => {
      criticalResources.forEach(resource => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = resource.href;
        link.as = resource.as;
        if (resource.type) link.type = resource.type;
        if (resource.crossOrigin) link.crossOrigin = resource.crossOrigin;
        
        // Add to head if not already present
        if (!document.querySelector(`link[href="${resource.href}"]`)) {
          document.head.appendChild(link);
        }
      });
    };

    preloadCriticalResources();
  }, []);

  // Preload route-specific resources
  useEffect(() => {
    const currentPath = location.pathname;
    const preloads = routePreloads[currentPath] || [];
    
    preloads.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource.href;
      link.as = resource.as;
      if (resource.type) link.type = resource.type;
      
      if (!document.querySelector(`link[href="${resource.href}"]`)) {
        document.head.appendChild(link);
      }
    });

    // Prefetch likely next pages
    const prefetches = routePrefetches[currentPath] || 
                      routePrefetches[Object.keys(routePrefetches).find(key => 
                        key.includes('*') && currentPath.includes(key.replace('/*', ''))
                      ) || ''] || [];

    prefetches.forEach(route => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = route;
      
      if (!document.querySelector(`link[href="${route}"][rel="prefetch"]`)) {
        document.head.appendChild(link);
      }
    });

    // Cleanup prefetch links after some time to avoid memory issues
    const cleanup = setTimeout(() => {
      document.querySelectorAll('link[rel="prefetch"]').forEach(link => {
        if (link.getAttribute('href') && !prefetches.includes(link.getAttribute('href')!)) {
          link.remove();
        }
      });
    }, 30000); // Clean up after 30 seconds

    return () => clearTimeout(cleanup);
  }, [location.pathname]);

  // Preload images when they enter viewport
  useEffect(() => {
    const imageObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const src = img.dataset.src;
            
            if (src && !img.src) {
              // Create preload link
              const link = document.createElement('link');
              link.rel = 'preload';
              link.href = src;
              link.as = 'image';
              document.head.appendChild(link);
              
              // Set src to start loading
              img.src = src;
              img.classList.remove('lazy-load');
              imageObserver.unobserve(img);
            }
          }
        });
      },
      {
        rootMargin: '50px 0px',
        threshold: 0.1
      }
    );

    // Observe all images with lazy loading
    const lazyImages = document.querySelectorAll('img[data-src]');
    lazyImages.forEach(img => imageObserver.observe(img));

    return () => imageObserver.disconnect();
  }, [location.pathname]);

  // DNS prefetch for external domains
  useEffect(() => {
    const externalDomains = [
      'fonts.googleapis.com',
      'fonts.gstatic.com',
      // Add any CDNs or external image hosts
    ];

    externalDomains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = `//${domain}`;
      
      if (!document.querySelector(`link[href="//${domain}"]`)) {
        document.head.appendChild(link);
      }
    });
  }, []);

  // Preconnect to critical external origins
  useEffect(() => {
    const criticalOrigins = [
      { href: 'https://fonts.googleapis.com', crossOrigin: false },
      { href: 'https://fonts.gstatic.com', crossOrigin: true },
      // Add Supabase URL if using external storage
    ];

    criticalOrigins.forEach(({ href, crossOrigin }) => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = href;
      if (crossOrigin) link.crossOrigin = 'anonymous';
      
      if (!document.querySelector(`link[href="${href}"][rel="preconnect"]`)) {
        document.head.appendChild(link);
      }
    });
  }, []);

  return <>{children}</>;
};

export default PreloadManager;