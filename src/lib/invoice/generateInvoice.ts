/**
 * Shared invoice generator — used by both /order-confirmation and /invoice/:orderId.
 * Produces a printable HTML blob (auto-prints on open) from a normalized order object.
 */

const COUNTRY_NAMES: Record<string, string> = {
  FR: 'France', DE: 'Allemagne', BE: 'Belgique', CH: 'Suisse',
  ES: 'Espagne', IT: 'Italie', NL: 'Pays-Bas', GB: 'Royaume-Uni',
  US: 'États-Unis', CA: 'Canada', MA: 'Maroc',
};

export interface InvoiceOrder {
  id: string;
  items: { name: string; quantity: number; price: number; image?: string }[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  currency: string;
  email: string;
  customerName: string;
  shippingAddress: any | null;
  createdAt: string;
}

export function generateInvoiceHTML(ro: InvoiceOrder): string {
  const orderNumber = (ro.id || 'N/A').slice(-8).toUpperCase();
  const invoiceNumber = `${new Date().getFullYear()}-${orderNumber}`;
  const orderDate = new Date(ro.createdAt || Date.now()).toLocaleDateString('fr-FR');
  const addr = ro.shippingAddress;
  const fmt = (n: number) => n.toFixed(2) + ' €';

  const itemsHtml = ro.items.length > 0
    ? ro.items.map((item) => `
      <tr>
        <td style="padding:10px;border-bottom:1px solid #eee;">${item.name}</td>
        <td style="padding:10px;border-bottom:1px solid #eee;text-align:right;">${item.quantity}</td>
        <td style="padding:10px;border-bottom:1px solid #eee;text-align:right;">${fmt(item.price)}</td>
        <td style="padding:10px;border-bottom:1px solid #eee;text-align:right;">${fmt(item.price * item.quantity)}</td>
      </tr>`).join('')
    : `<tr><td colspan="4" style="padding:14px;text-align:center;color:#888;">Détails non disponibles — voir email de confirmation</td></tr>`;

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Facture ${invoiceNumber}</title>
<style>body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#1a1a1a;max-width:800px;margin:0 auto;padding:40px;}
h1{color:#2d5016;font-size:24px;margin:0;}h2{color:#2d5016;margin:0;}
table{width:100%;border-collapse:collapse;margin:24px 0;}
th{background:#2d5016;color:#fff;padding:10px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;}
.total{font-size:20px;font-weight:bold;color:#2d5016;}
.muted{color:#888;font-size:12px;}
@media print{body{padding:20px;}}</style></head><body>
<div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #2d5016;padding-bottom:16px;">
<div><h1>Rif Raw Straw</h1><p class="muted">Artisanat Berbère Authentique</p></div>
<div style="text-align:right;"><h2>FACTURE</h2><p style="margin:4px 0;">${invoiceNumber}</p><p class="muted" style="margin:0;">${orderDate}</p></div></div>
${addr ? `<div style="margin:24px 0;"><strong>Client</strong><br/>${addr.first_name || ''} ${addr.last_name || ''}<br/>${addr.address_line1 || ''}<br/>${addr.postal_code || ''} ${addr.city || ''}<br/>${COUNTRY_NAMES[addr.country] || addr.country || ''}<br/><span class="muted">${ro.email}</span></div>` : `<div style="margin:24px 0;"><strong>Client</strong><br/>${ro.customerName || ''}<br/><span class="muted">${ro.email}</span></div>`}
<table><thead><tr><th>Produit</th><th style="text-align:right;">Qté</th><th style="text-align:right;">P.U.</th><th style="text-align:right;">Total</th></tr></thead>
<tbody>${itemsHtml}</tbody></table>
<div style="text-align:right;margin-top:20px;">
${ro.subtotal > 0 ? `<p style="margin:4px 0;">Sous-total : ${fmt(ro.subtotal)}</p>` : ''}
${ro.discount > 0 ? `<p style="margin:4px 0;color:#2d5016;">Réduction : -${fmt(ro.discount)}</p>` : ''}
${ro.subtotal > 0 ? `<p style="margin:4px 0;">Livraison : ${ro.shipping > 0 ? fmt(ro.shipping) : 'Offerte'}</p>` : ''}
<p class="total" style="margin-top:12px;">Total : ${fmt(ro.total)}</p></div>
<p class="muted" style="margin-top:40px;border-top:1px solid #eee;padding-top:16px;">TVA non applicable, art. 293 B du CGI. ID commande : ${ro.id}</p>
<script>window.onload=function(){setTimeout(function(){window.print();},300);}</script></body></html>`;
}

export function downloadInvoice(ro: InvoiceOrder) {
  const html = generateInvoiceHTML(ro);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
