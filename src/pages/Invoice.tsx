/**
 * /invoice/:orderId — Strict invoice page.
 *
 * Loads order + items + payment from Supabase. NO fallback. NO snapshot.
 * If data is missing/incomplete or RLS blocks access, shows an explicit error.
 */
import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Loader2, FileText, Home, ShoppingBag, Mail, ShieldCheck, AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import PageFooter from '@/components/PageFooter';
import { supabase } from '@/integrations/supabase/client';
import {
  downloadInvoice,
  validateInvoiceOrder,
  InvoiceValidationError,
  type InvoiceOrder,
} from '@/lib/invoice/generateInvoice';

const InvoicePage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvedOrder, setResolvedOrder] = useState<InvoiceOrder | null>(null);
  const [autoTriggered, setAutoTriggered] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!orderId) {
        setError('Identifiant de commande manquant.');
        setLoading(false);
        return;
      }
      try {
        const { data: order, error: orderErr } = await supabase
          .from('orders')
          .select('id, status, order_status, amount, currency, created_at, shipping_address, metadata, payment_method, payment_reference')
          .eq('id', orderId)
          .maybeSingle();

        if (orderErr) throw new Error('Impossible d\'accéder à la commande.');
        if (!order) throw new Error('Commande introuvable.');

        const { data: items, error: itemsErr } = await supabase
          .from('order_items')
          .select('quantity, unit_price, total_price, product_snapshot')
          .eq('order_id', orderId);

        if (itemsErr) throw new Error('Impossible de récupérer les articles.');
        if (!items || items.length === 0) throw new Error('Aucun article dans cette commande.');

        // Optional: payment record for accurate transaction date / method
        const { data: payment } = await supabase
          .from('payments')
          .select('payment_method, processed_at, stripe_payment_intent_id')
          .eq('order_id', orderId)
          .maybeSingle();

        const subtotal = items.reduce((s: number, i: any) => s + Number(i.total_price || 0), 0);
        const totalCents = Number(order.amount || 0);
        const total = totalCents / 100;
        const subtotalEur = subtotal / 100;
        const shipping = Math.max(0, total - subtotalEur);
        const addr = order.shipping_address as any;

        const built: InvoiceOrder = {
          id: order.id,
          items: items.map((it: any) => ({
            name: it.product_snapshot?.name || 'Produit',
            quantity: it.quantity,
            price: Number(it.unit_price) / 100,
            image: it.product_snapshot?.images?.[0],
          })),
          subtotal: subtotalEur,
          shipping,
          discount: Number((order.metadata as any)?.discount_amount || 0) / 100 || 0,
          total,
          currency: order.currency || 'EUR',
          email: (order.metadata as any)?.customer_email || addr?.email || '',
          customerName: addr ? `${addr.first_name || ''} ${addr.last_name || ''}`.trim() : '',
          shippingAddress: addr || null,
          createdAt: order.created_at,
          paymentMethod: payment?.payment_method || order.payment_method || 'Carte bancaire (Stripe)',
          paymentReference: payment?.stripe_payment_intent_id || order.payment_reference || undefined,
          paymentDate: payment?.processed_at || order.created_at,
          status: order.status || order.order_status || 'paid',
        };

        validateInvoiceOrder(built);
        if (!cancelled) setResolvedOrder(built);
      } catch (e) {
        const msg = e instanceof InvoiceValidationError ? e.message
                  : e instanceof Error ? e.message
                  : 'Erreur inconnue.';
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [orderId]);

  const handleDownload = useCallback(() => {
    if (!resolvedOrder) return;
    try {
      downloadInvoice(resolvedOrder);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la génération.');
    }
  }, [resolvedOrder]);

  // Auto-open once when ready
  useEffect(() => {
    if (loading || autoTriggered || !resolvedOrder) return;
    setAutoTriggered(true);
    const t = setTimeout(handleDownload, 400);
    return () => clearTimeout(t);
  }, [loading, autoTriggered, resolvedOrder, handleDownload]);

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

            {loading ? (
              <div className="py-8 flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Chargement de la facture…</span>
              </div>
            ) : error ? (
              <div className="mt-6">
                <p className="text-sm text-destructive mb-4">{error}</p>
                <p className="text-xs text-muted-foreground">
                  Si vous venez de payer, patientez quelques secondes et rechargez la page.
                  Pour toute aide : <a className="text-primary underline" href="mailto:contact@rifelegance.com">contact@rifelegance.com</a>
                </p>
              </div>
            ) : resolvedOrder ? (
              <>
                <p className="text-foreground mb-6 mt-4">
                  Total :{' '}
                  <span className="font-bold text-lg text-primary">
                    {resolvedOrder.total.toFixed(2)} €
                  </span>
                </p>
                <Button onClick={handleDownload} size="lg" className="gap-2 w-full sm:w-auto">
                  <FileText className="w-5 h-5" />
                  Télécharger / Imprimer la facture
                </Button>
                <p className="text-xs text-muted-foreground mt-4">
                  La facture s'ouvre dans un nouvel onglet (format A4, prête à imprimer ou enregistrer en PDF).
                </p>
              </>
            ) : null}
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
