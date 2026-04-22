/**
 * /invoice/:orderId — Backend-driven invoice page.
 *
 * Reads optional ?token=... for guest access via signed URL.
 * Calls the generate-invoice Edge Function and renders the returned HTML
 * inline via iframe srcDoc — clean same-origin URL, no blob: URLs.
 */
import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  Loader2,
  AlertTriangle,
  Printer,
  ArrowLeft,
  ShoppingBag,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { fetchInvoice, InvoiceError } from '@/lib/invoice/generateInvoice';

const InvoicePage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || undefined;
  const autoPrint = searchParams.get('print') === '1';

  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const triggeredRef = useRef(false);

  useEffect(() => {
    if (!orderId || triggeredRef.current) return;
    triggeredRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const { html } = await fetchInvoice(orderId, token);
        if (cancelled) return;
        setHtml(html);
      } catch (e) {
        if (cancelled) return;
        setError(
          e instanceof InvoiceError
            ? e.message
            : 'Erreur lors de la génération.'
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, token]);

  // Auto-print when ?print=1 and iframe is ready
  useEffect(() => {
    if (!autoPrint || !html) return;
    const t = setTimeout(() => {
      try {
        iframeRef.current?.contentWindow?.print();
      } catch {
        /* ignore */
      }
    }, 600);
    return () => clearTimeout(t);
  }, [autoPrint, html]);

  const handlePrint = () => {
    try {
      iframeRef.current?.contentWindow?.print();
    } catch {
      /* ignore */
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary mx-auto mb-3 animate-spin" />
          <p className="text-muted-foreground text-sm">
            Génération de votre facture…
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Commande #{(orderId || '').slice(-8).toUpperCase()}
          </p>
        </div>
      </div>
    );
  }

  if (error || !html) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl shadow-lg p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-destructive" />
          </div>
          <h1 className="font-serif text-2xl text-foreground mb-2">
            Facture indisponible
          </h1>
          <p className="text-sm text-muted-foreground mb-1">
            Commande{' '}
            <span className="font-mono font-medium text-foreground">
              #{(orderId || '').slice(-8).toUpperCase()}
            </span>
          </p>
          <p className="text-sm text-destructive mt-4 mb-6">
            {error || 'Aucun contenu reçu.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              size="sm"
            >
              Réessayer
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link to="/contact">Contacter le support</Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-6">
            Aide :{' '}
            <a
              className="text-primary underline"
              href="mailto:contact@rifelegance.com"
            >
              contact@rifelegance.com
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      {/* Toolbar — hidden when printing */}
      <div className="bg-card border-b border-border shadow-sm print:hidden">
        <div className="container mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="gap-2">
              <Link to={`/order-confirmation?order_id=${orderId}`}>
                <ArrowLeft className="w-4 h-4" /> Ma commande
              </Link>
            </Button>
            <span className="text-sm text-muted-foreground hidden sm:inline">
              Facture #{(orderId || '').slice(-8).toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="gap-2">
              <Link to="/products">
                <ShoppingBag className="w-4 h-4" /> Boutique
              </Link>
            </Button>
            <Button onClick={handlePrint} size="sm" className="gap-2">
              <Printer className="w-4 h-4" /> Imprimer / PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Invoice — rendered in iframe so its CSS is fully isolated */}
      <div className="flex-1 p-2 sm:p-6 print:p-0">
        <div className="max-w-4xl mx-auto bg-white shadow-xl print:shadow-none print:max-w-none">
          <iframe
            ref={iframeRef}
            srcDoc={html}
            title={`Facture commande ${orderId}`}
            className="w-full border-0 print:h-auto"
            style={{ height: 'calc(100vh - 100px)', minHeight: '900px' }}
          />
        </div>
      </div>
    </div>
  );
};

export default InvoicePage;
