import { Helmet } from 'react-helmet-async';
import { Product } from '@/shared/interfaces/Iproduct.interface';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: 'website' | 'product' | 'article';
  product?: Product;
  article?: {
    author?: string;
    publishedTime?: string;
    modifiedTime?: string;
    section?: string;
    tags?: string[];
  };
}

const SEOHelmet = ({
  title = "Rif Raw Straw - Artisanat Marocain Authentique",
  description = "Découvrez notre collection de sacs et chapeaux fabriqués à la main dans les montagnes du Rif. Artisanat durable et savoir-faire traditionnel marocain.",
  keywords = ["artisanat marocain", "sacs fait main", "chapeaux paille", "rif", "artisan", "durable", "traditionnel"],
  image = "/assets/images/home_page_image.webp",
  url,
  type = "website",
  product,
  article
}: SEOProps) => {
  const siteUrl = "https://rifrawstraw.lovable.app";
  const fullUrl = url ? `${siteUrl}${url}` : siteUrl;
  const fullImageUrl = image.startsWith('http') ? image : `${siteUrl}${image}`;

  // Generate structured data
  const generateStructuredData = () => {
    const baseData = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Rif Raw Straw",
      "url": siteUrl,
      "logo": `${siteUrl}/favicon.png`,
      "description": description,
      "address": {
        "@type": "PostalAddress",
        "addressCountry": "MA",
        "addressRegion": "Rif Mountains"
      },
      "sameAs": [
        "https://instagram.com/artisan_maroc"
      ]
    };

    if (type === 'product' && product) {
      const stockQuantity = product.stock_quantity ?? 0;
      const isInStock = stockQuantity > 0;
      const ratingValue = product.rating_average ?? 4.8;
      const reviewCount = product.rating_count ?? 0;
      
      return {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": product.name,
        "description": product.description?.substring(0, 500),
        "image": product.images.map(img => img.startsWith('http') ? img : `${siteUrl}${img}`),
        "sku": product.id.toString(),
        "mpn": `RRS-${product.id}`,
        "category": product.category,
        "material": product.material || "Fibres naturelles",
        "brand": {
          "@type": "Brand",
          "name": "Rif Raw Straw"
        },
        "manufacturer": {
          "@type": "Organization",
          "name": product.artisan || "Artisan du Rif"
        },
        "offers": {
          "@type": "Offer",
          "price": product.price,
          "priceCurrency": "EUR",
          "availability": isInStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          "itemCondition": "https://schema.org/NewCondition",
          "seller": {
            "@type": "Organization",
            "name": "Rif Raw Straw"
          },
          "shippingDetails": {
            "@type": "OfferShippingDetails",
            "shippingDestination": {
              "@type": "DefinedRegion",
              "addressCountry": ["FR", "BE", "CH", "LU"]
            },
            "deliveryTime": {
              "@type": "ShippingDeliveryTime",
              "handlingTime": {
                "@type": "QuantitativeValue",
                "minValue": 1,
                "maxValue": 3,
                "unitCode": "DAY"
              },
              "transitTime": {
                "@type": "QuantitativeValue",
                "minValue": 2,
                "maxValue": 5,
                "unitCode": "DAY"
              }
            }
          }
        },
        ...(reviewCount > 0 && {
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": ratingValue.toFixed(1),
            "reviewCount": reviewCount,
            "bestRating": "5",
            "worstRating": "1"
          }
        })
      };
    }

    if (type === 'article' && article) {
      return {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": title,
        "description": description,
        "image": fullImageUrl,
        "author": {
          "@type": "Person",
          "name": article.author || "Rif Raw Straw"
        },
        "publisher": {
          "@type": "Organization",
          "name": "Rif Raw Straw",
          "logo": {
            "@type": "ImageObject",
            "url": `${siteUrl}/favicon.png`
          }
        },
        "datePublished": article.publishedTime,
        "dateModified": article.modifiedTime || article.publishedTime,
        "articleSection": article.section,
        "keywords": article.tags?.join(', ') || keywords.join(', ')
      };
    }

    return baseData;
  };

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords.join(', ')} />
      <link rel="canonical" href={fullUrl} />
      
      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImageUrl} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="Rif Raw Straw" />
      <meta property="og:locale" content="fr_FR" />
      
      {product && (
        <>
          <meta property="product:brand" content="Rif Raw Straw" />
          <meta property="product:availability" content="in stock" />
          <meta property="product:condition" content="new" />
          <meta property="product:price:amount" content={product.price.toString()} />
          <meta property="product:price:currency" content="EUR" />
        </>
      )}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImageUrl} />
      
      {/* Additional SEO Meta Tags */}
      <meta name="robots" content="index, follow, max-image-preview:large" />
      <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
      <meta name="language" content="French" />
      <meta name="revisit-after" content="7 days" />
      <meta name="author" content="Rif Raw Straw" />
      
      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(generateStructuredData())}
      </script>

      {/* Performance and Mobile Optimization */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
      <meta name="theme-color" content="#84724B" />
      <meta name="msapplication-TileColor" content="#84724B" />
      
      {/* Preconnect to external domains for performance */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      
      {/* DNS Prefetch for external resources */}
      <link rel="dns-prefetch" href="//fonts.googleapis.com" />
      <link rel="dns-prefetch" href="//fonts.gstatic.com" />
    </Helmet>
  );
};

export default SEOHelmet;