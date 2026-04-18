/**
 * /invoice/:orderId — Backend-driven invoice page.
 *
 * Reads optional ?token=... for guest access via signed URL.
 * Calls the generate-invoice Edge Function — no DB access here.
 */
import { useEffect, useState, useCallback } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Loader2, FileText, Home, ShoppingBag, Mail, ShieldCheck, AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import PageFooter from '@/components/PageFooter';
import { downloadInvoice, InvoiceError } from '@/lib/invoice/generateInvoice';

const InvoicePage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || undefined;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoTriggered, setAutoTriggered] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!orderId) return;
    setBusy(true);
    setError(null);
    try {
      await downloadInvoice(orderId, token);
    } catch (e) {
      setError(e instanceof InvoiceError ? e.message : 'Erreur lors de la génération.');
    } finally {
      setBusy(false);
    }
  }, [orderId, token]);

  useEffect(() => {
    if (autoTriggered || !orderId) return;
    setAutoTriggered(true);
    const t = setTimeout(handleDownload, 400);
    return () => clearTimeout(t);
  }, [autoTriggered, orderId, handleDownload]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-xl mx-auto">
          <div className="bg-card rounded-2xl border border-border shadow-lg p-8 text-center animate-fade-in">
            <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${error ? 'bg-destructive/10' : 'bg-primary/10'}`}>
              {error ? <AlertTriangle className="w-8 h-8 text-destructive" /> : <FileText className="w-8 h-8 text-primary" />}
            </div>
            <h1 className="font-serif text-2xl md:text-3xl text-foreground mb-2">
              {error ? 'Facture indisponible' : 'Votre facture'}
            </h1>
            <p className="text-muted-foreground mb-1 text-sm">
              Commande{' '}
              <span className="font-mono font-medium text-foreground">
                #{(orderId || '').slice(-8).toUpperCase()}
              </span>
            </p>

            {error ? (
              <div className="mt-6">
                <p className="text-sm text-destructive mb-4">{error}</p>
                <Button onClick={handleDownload} variant="outline" size="sm" disabled={busy}>
                  Réessayer
                </Button>
                <p className="text-xs text-muted-foreground mt-4">
                  Pour toute aide :{' '}
                  <a className="text-primary underline" href="mailto:contact@rifelegance.com">
                    contact@rifelegance.com
                  </a>
                </p>
              </div>
            ) : (
              <>
                <p className="text-foreground mb-6 mt-4 text-sm">
                  Cliquez ci-dessous pour ouvrir votre facture officielle.
                </p>
                <Button onClick={handleDownload} size="lg" disabled={busy} className="gap-2 w-full sm:w-auto">
                  {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                  {busy ? 'Génération…' : 'Télécharger / Imprimer la facture'}
                </Button>
                <p className="text-xs text-muted-foreground mt-4">
                  La facture s'ouvre dans un nouvel onglet (format A4, prête à imprimer ou enregistrer en PDF).
                </p>
              </>
            )}
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-6">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>Paiement sécurisé via Stripe — TVA non applicable, art. 293 B du CGI</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8 flex-wrap">
            {orderId && (
              <Button asChild variant="outline" className="gap-2">
                <Link to={`/order-confirmation?order_id=${orderId}`}>Voir ma commande</Link>
              </Button>
            )}
            <Button asChild variant="secondary" className="gap-2">
              <Link to="/products"><ShoppingBag className="w-4 h-4" /> Continuer mes achats</Link>
            </Button>
            <Button asChild variant="ghost" className="gap-2">
              <Link to="/"><Home className="w-4 h-4" /> Accueil</Link>
            </Button>
          </div>

          <div className="text-center mt-10 text-sm text-muted-foreground">
            Une question ?{' '}
            <Link to="/contact" className="text-primary underline inline-flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" /> Contactez-nous
            </Link>
          </div>
        </div>
      </div>
      <PageFooter />
    </div>
  );
};

export default InvoicePage;
