/**
 * /invoice/:orderId — Direct invoice access route.
 *
 * Loads the order from DB (with snapshot fallback for guests) and offers
 * an immediate download. Used by email "Download Invoice" link to give
 * users a distinct, dedicated invoice page (separate from /order-confirmation).
 */
import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Loader2, FileText, Home, ShoppingBag, Mail, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import PageFooter from '@/components/PageFooter';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { downloadInvoice, type InvoiceOrder } from '@/lib/invoice/generateInvoice';

interface SnapshotShape {
  email: string;
  customerName: string;
  items: { name: string; quantity: number; price: number; image?: string }[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  currency: string;
  timestamp: number;
}

function loadSnapshot(): SnapshotShape | null {
  try {
    const raw = localStorage.getItem('checkout_snapshot');
    if (!raw) return null;
    const data = JSON.parse(raw) as SnapshotShape;
    if (Date.now() - data.timestamp > 3600_000) return null;
    return data;
  } catch {
    return null;
  }
}

const InvoicePage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [snapshot] = useState<SnapshotShape | null>(() => loadSnapshot());
  const [autoTriggered, setAutoTriggered] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!orderId) {
        setLoading(false);
        return;
      }
      try {
        const { data: orderData } = await supabase
          .from('orders')
          .select('id, status, order_status, amount, currency, created_at, shipping_address, metadata')
          .eq('id', orderId)
          .maybeSingle();
        if (!cancelled && orderData) {
          setOrder(orderData);
          const { data: itemsData } = await supabase
            .from('order_items')
            .select('quantity, unit_price, total_price, product_snapshot')
            .eq('order_id', orderId);
          if (!cancelled) {
            setItems(
              (itemsData || []).map((it: any) => ({
                name: it.product_snapshot?.name || 'Produit',
                quantity: it.quantity,
                price: it.unit_price / 100,
                image: it.product_snapshot?.images?.[0],
                total_price: it.total_price,
              })),
            );
          }
        }
      } catch {
        /* RLS / network — silent, fall back to snapshot */
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [orderId]);

  const resolvedOrder = useMemo<InvoiceOrder>(() => {
    if (order) {
      const subtotal = items.reduce((s, i) => s + (i.total_price || 0), 0) / 100;
      const total = (order.amount || 0) / 100;
      const addr = order.shipping_address;
      return {
        id: order.id,
        items: items.length > 0
          ? items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price, image: i.image }))
          : (snapshot?.items || []),
        subtotal: items.length > 0 ? subtotal : (snapshot?.subtotal || 0),
        shipping: items.length > 0 ? Math.max(0, total - subtotal) : (snapshot?.shipping || 0),
        discount: snapshot?.discount || 0,
        total: total || snapshot?.total || 0,
        currency: order.currency || 'EUR',
        email: order.metadata?.customer_email || snapshot?.email || user?.email || 'N/A',
        customerName: addr ? `${addr.first_name || ''} ${addr.last_name || ''}`.trim() : (snapshot?.customerName || profile?.full_name || ''),
        shippingAddress: addr || null,
        createdAt: order.created_at,
      };
    }
    if (snapshot) {
      return {
        id: orderId || 'N/A',
        items: snapshot.items,
        subtotal: snapshot.subtotal,
        shipping: snapshot.shipping,
        discount: snapshot.discount,
        total: snapshot.total,
        currency: snapshot.currency,
        email: snapshot.email || user?.email || 'N/A',
        customerName: snapshot.customerName || profile?.full_name || '',
        shippingAddress: null,
        createdAt: new Date(snapshot.timestamp).toISOString(),
      };
    }
    return {
      id: orderId || 'N/A',
      items: [],
      subtotal: 0,
      shipping: 0,
      discount: 0,
      total: 0,
      currency: 'EUR',
      email: user?.email || 'N/A',
      customerName: profile?.full_name || '',
      shippingAddress: null,
      createdAt: new Date().toISOString(),
    };
  }, [order, items, snapshot, orderId, user?.email, profile?.full_name]);

  const handleDownload = useCallback(() => {
    downloadInvoice(resolvedOrder);
  }, [resolvedOrder]);

  // Auto-trigger download once when ready
  useEffect(() => {
    if (loading || autoTriggered) return;
    setAutoTriggered(true);
    const t = setTimeout(handleDownload, 500);
    return () => clearTimeout(t);
  }, [loading, autoTriggered, handleDownload]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-xl mx-auto">
          <div className="bg-card rounded-2xl border border-border shadow-lg p-8 text-center animate-fade-in">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-serif text-2xl md:text-3xl text-foreground mb-2">
              Votre facture
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
                <span>Préparation de votre facture…</span>
              </div>
            ) : (
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
                  La facture s'ouvre dans un nouvel onglet, prête à être imprimée ou enregistrée en PDF.
                </p>
              </>
            )}
          </div>

          {/* Trust elements */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-6">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>Paiement sécurisé via Stripe — TVA non applicable, art. 293 B du CGI</span>
          </div>

          {/* Secondary nav */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8 flex-wrap">
            {orderId && (
              <Button asChild variant="outline" className="gap-2">
                <Link to={`/order-confirmation?order_id=${orderId}`}>
                  Voir ma commande
                </Link>
              </Button>
            )}
            <Button asChild variant="secondary" className="gap-2">
              <Link to="/products">
                <ShoppingBag className="w-4 h-4" />
                Continuer mes achats
              </Link>
            </Button>
            <Button asChild variant="ghost" className="gap-2">
              <Link to="/">
                <Home className="w-4 h-4" />
                Accueil
              </Link>
            </Button>
          </div>

          <div className="text-center mt-10 text-sm text-muted-foreground">
            Une question ?{' '}
            <Link to="/contact" className="text-primary underline inline-flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" />
              Contactez-nous
            </Link>
          </div>
        </div>
      </div>
      <PageFooter />
    </div>
  );
};

export default InvoicePage;
