/**
 * Professional invoice generator — A4 print-ready, legally compliant (FR).
 *
 * Strict data contract: caller MUST provide a fully resolved order object
 * sourced from Supabase. Validation rejects empty/zero invoices.
 */

const PRODUCTION_URL = 'https://www.rifelegance.com';
const SUPPORT_EMAIL = 'contact@rifelegance.com';

const COUNTRY_NAMES: Record<string, string> = {
  FR: 'France', DE: 'Allemagne', BE: 'Belgique', CH: 'Suisse',
  ES: 'Espagne', IT: 'Italie', NL: 'Pays-Bas', GB: 'Royaume-Uni',
  US: 'États-Unis', CA: 'Canada', MA: 'Maroc',
};

export interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
  image?: string;
}

export interface InvoiceOrder {
  id: string;
  items: InvoiceItem[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  currency: string;
  email: string;
  customerName: string;
  shippingAddress: any | null;
  createdAt: string;
  paymentMethod?: string;
  paymentReference?: string;
  paymentDate?: string;
  status?: string;
}

export class InvoiceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvoiceValidationError';
  }
}

/** Strict validation — no fallback rendering allowed. */
export function validateInvoiceOrder(o: InvoiceOrder | null | undefined): asserts o is InvoiceOrder {
  if (!o) throw new InvoiceValidationError('Order is missing');
  if (!o.id) throw new InvoiceValidationError('Order ID is missing');
  if (!Array.isArray(o.items) || o.items.length === 0) {
    throw new InvoiceValidationError('Order has no items');
  }
  if (!o.total || o.total <= 0) throw new InvoiceValidationError('Order total is zero');
  if (!o.email) throw new InvoiceValidationError('Customer email is missing');
}

const fmtEUR = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

export function generateInvoiceHTML(order: InvoiceOrder): string {
  validateInvoiceOrder(order);

  const orderShort = order.id.slice(-8).toUpperCase();
  const invoiceNumber = `${new Date(order.createdAt).getFullYear()}-${orderShort}`;
  const issueDate = fmtDate(order.createdAt);
  const paymentDate = fmtDate(order.paymentDate || order.createdAt);
  const isPaid = (order.status || 'paid').toLowerCase() === 'paid' ||
                  (order.status || '').toLowerCase() === 'completed' ||
                  (order.status || '').toLowerCase() === 'confirmed';
  const addr = order.shippingAddress;

  const itemsRows = order.items.map((it) => `
    <tr>
      <td class="cell">${escapeHtml(it.name)}</td>
      <td class="cell num">${it.quantity}</td>
      <td class="cell num">${fmtEUR(it.price)}</td>
      <td class="cell num">${fmtEUR(it.price * it.quantity)}</td>
    </tr>`).join('');

  const clientBlock = addr ? `
    <strong>${escapeHtml(`${addr.first_name || ''} ${addr.last_name || ''}`.trim() || order.customerName)}</strong><br/>
    ${escapeHtml(order.email)}<br/>
    ${escapeHtml(addr.address_line1 || '')}<br/>
    ${addr.address_line2 ? `${escapeHtml(addr.address_line2)}<br/>` : ''}
    ${escapeHtml(`${addr.postal_code || ''} ${addr.city || ''}`.trim())}<br/>
    ${escapeHtml(COUNTRY_NAMES[addr.country] || addr.country || '')}
  ` : `
    <strong>${escapeHtml(order.customerName || '—')}</strong><br/>
    ${escapeHtml(order.email)}
  `;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Facture ${invoiceNumber} — Rif Raw Straw</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{background:#f5f3ee;font-family:'Helvetica Neue',Arial,sans-serif;color:#1a1a1a;font-size:11pt;line-height:1.5}
  .sheet{background:#fff;max-width:210mm;min-height:297mm;margin:20px auto;padding:18mm 16mm;box-shadow:0 4px 24px rgba(0,0,0,.08)}
  .row{display:flex;justify-content:space-between;align-items:flex-start;gap:24px}
  .brand h1{font-family:'Playfair Display',Georgia,serif;font-size:28pt;color:#2d5016;font-weight:700;letter-spacing:-.5px}
  .brand .tagline{color:#7a7a7a;font-size:9.5pt;margin-top:2px}
  .invoice-meta{text-align:right}
  .invoice-meta .label{font-family:'Playfair Display',Georgia,serif;font-size:24pt;color:#1a1a1a;letter-spacing:2px}
  .invoice-meta .num{font-size:11pt;font-weight:600;color:#2d5016;margin-top:6px}
  .invoice-meta .date{color:#7a7a7a;font-size:9.5pt;margin-top:2px}
  .badge{display:inline-flex;align-items:center;gap:6px;margin-top:10px;padding:6px 12px;border-radius:999px;font-size:9pt;font-weight:600;letter-spacing:.5px;text-transform:uppercase}
  .badge.paid{background:#2d5016;color:#fff}
  .badge.unpaid{background:#a04040;color:#fff}
  .divider{height:1px;background:#e5e1d8;margin:22px 0}
  .parties{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:8px}
  .party h3{font-size:8.5pt;font-weight:700;letter-spacing:1.5px;color:#7a7a7a;text-transform:uppercase;margin-bottom:8px}
  .party p{font-size:10pt;line-height:1.6}
  table{width:100%;border-collapse:collapse;margin-top:24px}
  thead th{background:#2d5016;color:#fff;font-size:8.5pt;font-weight:600;text-transform:uppercase;letter-spacing:1px;padding:10px 12px;text-align:left}
  thead th.num{text-align:right}
  .cell{padding:12px;font-size:10.5pt;border-bottom:1px solid #ece8de}
  .cell.num{text-align:right;font-variant-numeric:tabular-nums}
  .totals-wrap{display:flex;justify-content:flex-end;margin-top:18px}
  .totals{width:280px}
  .totals .line{display:flex;justify-content:space-between;padding:6px 0;font-size:10.5pt}
  .totals .line.muted{color:#5a5a5a}
  .totals .line.discount{color:#2d5016}
  .totals .grand{margin-top:8px;padding-top:12px;border-top:2px solid #2d5016;display:flex;justify-content:space-between;align-items:baseline}
  .totals .grand .lbl{font-family:'Playfair Display',Georgia,serif;font-size:14pt;color:#1a1a1a}
  .totals .grand .val{font-family:'Playfair Display',Georgia,serif;font-size:20pt;color:#2d5016;font-weight:700}
  .payment{margin-top:28px;padding:16px 18px;background:#f5f3ee;border-radius:6px;display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
  .payment .field .k{font-size:8pt;text-transform:uppercase;letter-spacing:1px;color:#7a7a7a;margin-bottom:4px}
  .payment .field .v{font-size:10pt;font-weight:600}
  .footer{margin-top:32px;padding-top:18px;border-top:1px solid #e5e1d8;font-size:8.5pt;color:#7a7a7a;line-height:1.7}
  .footer strong{color:#1a1a1a}
  .thanks{text-align:center;margin-top:24px;font-family:'Playfair Display',Georgia,serif;font-size:13pt;font-style:italic;color:#2d5016}
  .toolbar{position:fixed;top:16px;right:16px;display:flex;gap:8px;z-index:100}
  .toolbar button{background:#2d5016;color:#fff;border:0;padding:10px 16px;border-radius:6px;font-size:10pt;font-weight:600;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.15)}
  .toolbar button:hover{background:#1f3a0f}
  @media print{
    html,body{background:#fff}
    .sheet{margin:0;box-shadow:none;max-width:none;min-height:auto;padding:14mm 14mm}
    .toolbar{display:none}
    @page{size:A4;margin:0}
  }
</style>
</head>
<body>
<div class="toolbar">
  <button onclick="window.print()">Imprimer / PDF</button>
</div>
<div class="sheet">
  <div class="row">
    <div class="brand">
      <h1>Rif Raw Straw</h1>
      <div class="tagline">Artisanat Berbère Authentique</div>
    </div>
    <div class="invoice-meta">
      <div class="label">FACTURE</div>
      <div class="num">N° ${invoiceNumber}</div>
      <div class="date">Émise le ${issueDate}</div>
      <div class="badge ${isPaid ? 'paid' : 'unpaid'}">${isPaid ? '✓ Payée' : 'En attente'}</div>
    </div>
  </div>

  <div class="divider"></div>

  <div class="parties">
    <div class="party">
      <h3>Vendeur</h3>
      <p>
        <strong>Rif Raw Straw</strong><br/>
        Artisanat &amp; Commerce<br/>
        ${SUPPORT_EMAIL}<br/>
        ${PRODUCTION_URL.replace('https://', '')}<br/>
        <span style="color:#7a7a7a;font-size:9pt">TVA non applicable, art. 293 B du CGI</span>
      </p>
    </div>
    <div class="party">
      <h3>Client</h3>
      <p>${clientBlock}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th class="num">Qté</th>
        <th class="num">Prix unitaire</th>
        <th class="num">Total</th>
      </tr>
    </thead>
    <tbody>${itemsRows}</tbody>
  </table>

  <div class="totals-wrap">
    <div class="totals">
      <div class="line muted"><span>Sous-total</span><span>${fmtEUR(order.subtotal)}</span></div>
      <div class="line muted"><span>Livraison</span><span>${order.shipping > 0 ? fmtEUR(order.shipping) : 'Offerte'}</span></div>
      ${order.discount > 0 ? `<div class="line discount"><span>Remise</span><span>−${fmtEUR(order.discount)}</span></div>` : ''}
      <div class="grand"><span class="lbl">TOTAL</span><span class="val">${fmtEUR(order.total)}</span></div>
    </div>
  </div>

  <div class="payment">
    <div class="field">
      <div class="k">Mode de paiement</div>
      <div class="v">${escapeHtml(order.paymentMethod || 'Carte bancaire (Stripe)')}</div>
    </div>
    <div class="field">
      <div class="k">Date de paiement</div>
      <div class="v">${paymentDate}</div>
    </div>
    <div class="field">
      <div class="k">ID transaction</div>
      <div class="v" style="font-family:Menlo,monospace;font-size:9pt">${escapeHtml(order.paymentReference || order.id)}</div>
    </div>
  </div>

  <div class="thanks">Merci pour votre confiance.</div>

  <div class="footer">
    <strong>Mentions légales :</strong> TVA non applicable, article 293 B du Code Général des Impôts.<br/>
    <strong>Retours :</strong> sous 14 jours à compter de la réception. Voir conditions sur ${PRODUCTION_URL}.<br/>
    <strong>Support :</strong> ${SUPPORT_EMAIL} — ${PRODUCTION_URL}
  </div>
</div>
</body>
</html>`;
}

function escapeHtml(s: any): string {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Open invoice in a new tab (uses document.write so the URL stays clean —
 * no blob: URLs which trip popup blockers and look unprofessional).
 */
export function downloadInvoice(order: InvoiceOrder) {
  validateInvoiceOrder(order);
  const html = generateInvoiceHTML(order);
  const w = window.open('', '_blank');
  if (!w) {
    // Popup blocked — fallback to current-tab navigation via data: URL is also ugly,
    // so surface a clear error to the caller.
    throw new Error('Popup bloqué. Autorisez les fenêtres pop-up pour télécharger la facture.');
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.document.title = `Facture ${order.id.slice(-8).toUpperCase()} — Rif Raw Straw`;
}
