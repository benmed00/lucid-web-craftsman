/**
 * Pure HTML renderer — no fetch, no side effects, deterministic.
 * Premium A4 layout, French legal compliance (Art. 293 B du CGI).
 */
import type { InvoiceData } from './types.ts';

const PRODUCTION_URL = 'https://www.rifelegance.com';
const SUPPORT_EMAIL = 'contact@rifelegance.com';

const COUNTRY_NAMES: Record<string, string> = {
  FR: 'France',
  DE: 'Allemagne',
  BE: 'Belgique',
  CH: 'Suisse',
  ES: 'Espagne',
  IT: 'Italie',
  NL: 'Pays-Bas',
  GB: 'Royaume-Uni',
  US: 'États-Unis',
  CA: 'Canada',
  MA: 'Maroc',
};

function escapeHtml(s: unknown): string {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtEUR(n: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(n);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function renderInvoiceHTML(data: InvoiceData): string {
  const isPaid = data.payment.status === 'paid';
  const c = data.client;
  const country = COUNTRY_NAMES[c.country] || c.country || '';

  const itemsRows = data.items
    .map(
      (it) => `
    <tr>
      <td class="cell">${escapeHtml(it.name)}</td>
      <td class="cell num">${it.quantity}</td>
      <td class="cell num">${fmtEUR(it.unit_price)}</td>
      <td class="cell num">${fmtEUR(it.total)}</td>
    </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Facture ${escapeHtml(data.invoice_number)} — Rif Raw Straw</title>
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
      <div class="num">N° ${escapeHtml(data.invoice_number)}</div>
      <div class="date">Émise le ${fmtDate(data.issue_date)}</div>
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
      <p>
        <strong>${escapeHtml(c.name || '—')}</strong><br/>
        ${escapeHtml(c.email)}<br/>
        ${c.address_line1 ? `${escapeHtml(c.address_line1)}<br/>` : ''}
        ${c.address_line2 ? `${escapeHtml(c.address_line2)}<br/>` : ''}
        ${c.postal_code || c.city ? `${escapeHtml(`${c.postal_code} ${c.city}`.trim())}<br/>` : ''}
        ${escapeHtml(country)}
      </p>
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
      <div class="line muted"><span>Sous-total</span><span>${fmtEUR(data.totals.subtotal)}</span></div>
      <div class="line muted"><span>Livraison</span><span>${data.totals.shipping > 0 ? fmtEUR(data.totals.shipping) : 'Offerte'}</span></div>
      ${data.totals.discount > 0 ? `<div class="line discount"><span>Remise</span><span>−${fmtEUR(data.totals.discount)}</span></div>` : ''}
      <div class="grand"><span class="lbl">TOTAL</span><span class="val">${fmtEUR(data.totals.total)}</span></div>
    </div>
  </div>

  <div class="payment">
    <div class="field">
      <div class="k">Mode de paiement</div>
      <div class="v">${escapeHtml(data.payment.method)}</div>
    </div>
    <div class="field">
      <div class="k">Date de paiement</div>
      <div class="v">${data.payment.paid_at ? fmtDate(data.payment.paid_at) : '—'}</div>
    </div>
    <div class="field">
      <div class="k">ID transaction</div>
      <div class="v" style="font-family:Menlo,monospace;font-size:9pt">${escapeHtml(data.payment.transaction_id || '—')}</div>
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
