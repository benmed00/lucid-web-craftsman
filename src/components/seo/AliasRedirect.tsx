import { Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const SITE_URL = 'https://rif-raw-straw.lovable.app';

interface AliasRedirectProps {
  /** Canonical target path, e.g. "/" or "/products". */
  to: string;
}

/**
 * Renders a canonical link pointing at the target URL, then performs a
 * client-side redirect. This consolidates SEO signals so crawlers (and
 * JS-executing bots) consistently pick the canonical route over the alias.
 */
const AliasRedirect = ({ to }: AliasRedirectProps) => {
  const canonical = `${SITE_URL}${to}`;
  return (
    <>
      <Helmet>
        <link rel="canonical" href={canonical} />
        <meta property="og:url" content={canonical} />
        <meta name="robots" content="noindex, follow" />
        {/* Google treats an instant meta-refresh as the equivalent of a
            301 when paired with a self-consistent canonical. This is the
            closest we can get to a server-side 301 on Lovable's static
            SPA hosting (no per-route headers / _redirects). */}
        <meta httpEquiv="refresh" content={`0; url=${to}`} />
      </Helmet>
      <Navigate to={to} replace />
    </>
  );
};

export default AliasRedirect;
