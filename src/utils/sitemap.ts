import { Product } from '@/shared/interfaces/Iproduct.interface';
import { BlogPost } from '@/shared/interfaces/IBlogPost.interface';

interface SitemapUrl {
  url: string;
  lastModified?: string;
  changeFrequency?:
    | 'always'
    | 'hourly'
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'yearly'
    | 'never';
  priority?: number;
}

export class SitemapGenerator {
  private baseUrl: string;

  constructor(baseUrl: string = 'https://rifrawstraw.lovable.app') {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  // Generate static routes
  private getStaticRoutes(): SitemapUrl[] {
    return [
      {
        url: `${this.baseUrl}/`,
        lastModified: new Date().toISOString(),
        changeFrequency: 'daily',
        priority: 1.0,
      },
      {
        url: `${this.baseUrl}/products`,
        lastModified: new Date().toISOString(),
        changeFrequency: 'daily',
        priority: 0.9,
      },
      {
        url: `${this.baseUrl}/blog`,
        lastModified: new Date().toISOString(),
        changeFrequency: 'weekly',
        priority: 0.8,
      },
      {
        url: `${this.baseUrl}/about`,
        lastModified: new Date().toISOString(),
        changeFrequency: 'monthly',
        priority: 0.7,
      },
      {
        url: `${this.baseUrl}/story`,
        lastModified: new Date().toISOString(),
        changeFrequency: 'monthly',
        priority: 0.6,
      },
      {
        url: `${this.baseUrl}/contact`,
        lastModified: new Date().toISOString(),
        changeFrequency: 'monthly',
        priority: 0.5,
      },
      {
        url: `${this.baseUrl}/shipping`,
        lastModified: new Date().toISOString(),
        changeFrequency: 'monthly',
        priority: 0.4,
      },
      {
        url: `${this.baseUrl}/returns`,
        lastModified: new Date().toISOString(),
        changeFrequency: 'monthly',
        priority: 0.4,
      },
      {
        url: `${this.baseUrl}/terms`,
        lastModified: new Date().toISOString(),
        changeFrequency: 'yearly',
        priority: 0.3,
      },
      {
        url: `${this.baseUrl}/cgv`,
        lastModified: new Date().toISOString(),
        changeFrequency: 'yearly',
        priority: 0.3,
      },
    ];
  }

  // Generate product routes
  private getProductRoutes(products: Product[]): SitemapUrl[] {
    return products.map((product) => ({
      url: `${this.baseUrl}/product/${product.id}`,
      lastModified:
        product.updated_at || product.created_at || new Date().toISOString(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
  }

  // Generate blog routes
  private getBlogRoutes(posts: BlogPost[]): SitemapUrl[] {
    return posts.map((post) => ({
      url: `${this.baseUrl}/blog/${post.id}`,
      lastModified: post.date,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }));
  }

  // Generate category routes
  private getCategoryRoutes(products: Product[]): SitemapUrl[] {
    const categories = [...new Set(products.map((p) => p.category))];
    return categories.map((category) => ({
      url: `${this.baseUrl}/products?category=${encodeURIComponent(category)}`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  }

  // Generate complete sitemap
  generateSitemap(products: Product[] = [], posts: BlogPost[] = []): string {
    const urls: SitemapUrl[] = [
      ...this.getStaticRoutes(),
      ...this.getProductRoutes(products),
      ...this.getBlogRoutes(posts),
      ...this.getCategoryRoutes(products),
    ];

    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    ({ url, lastModified, changeFrequency, priority }) => `  <url>
    <loc>${url}</loc>${
      lastModified
        ? `
    <lastmod>${lastModified}</lastmod>`
        : ''
    }${
      changeFrequency
        ? `
    <changefreq>${changeFrequency}</changefreq>`
        : ''
    }${
      priority
        ? `
    <priority>${priority}</priority>`
        : ''
    }
  </url>`
  )
  .join('\n')}
</urlset>`;

    return xmlContent;
  }

  // Generate robots.txt with sitemap reference
  generateRobotsTxt(): string {
    return `User-agent: *
Allow: /

# Sitemaps
Sitemap: ${this.baseUrl}/sitemap.xml

# Crawl-delay for respectful crawling
Crawl-delay: 1

# Block admin areas
Disallow: /admin/
Disallow: /api/
Disallow: /cart/
Disallow: /checkout/
Disallow: /profile/

# Block search parameters
Disallow: /*?*sort=
Disallow: /*?*filter=
Disallow: /*?*search=

# Allow important paths
Allow: /products
Allow: /blog
Allow: /about
Allow: /contact`;
  }

  // Generate RSS feed for blog posts
  generateRSSFeed(posts: BlogPost[]): string {
    const rssContent = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Rif Raw Straw - Blog</title>
    <link>${this.baseUrl}/blog</link>
    <description>Découvrez les histoires et savoir-faire de nos artisans marocains</description>
    <language>fr</language>
    <atom:link href="${this.baseUrl}/rss.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <generator>Rif Raw Straw</generator>
${posts
  .slice(0, 20)
  .map(
    (post) => `    <item>
      <title>${post.title}</title>
      <link>${this.baseUrl}/blog/${post.id}</link>
      <description>${post.excerpt}...</description>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <guid isPermaLink="true">${this.baseUrl}/blog/${post.id}</guid>
      ${post.image ? `<enclosure url="${post.image}" type="image/jpeg" />` : ''}
    </item>`
  )
  .join('\n')}
  </channel>
</rss>`;

    return rssContent;
  }
}

// Utility functions for generating and downloading sitemaps
export const generateAndDownloadSitemap = async (
  products: Product[],
  posts: BlogPost[] = []
) => {
  const generator = new SitemapGenerator();
  const sitemap = generator.generateSitemap(products, posts);

  const blob = new Blob([sitemap], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sitemap.xml';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const generateAndDownloadRobots = () => {
  const generator = new SitemapGenerator();
  const robots = generator.generateRobotsTxt();

  const blob = new Blob([robots], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'robots.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export default SitemapGenerator;
