// Plain HTML email template — no React dependency

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  image?: string;
  productId?: number;
}

interface OrderConfirmationProps {
  customerName: string;
  orderNumber: string;
  orderDate: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  currency: string;
  shippingAddress: {
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
  estimatedDelivery: string;
  orderId?: string;
}

const esc = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const formatPrice = (price: number, currency: string) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(price);

const SITE_URL = 'https://www.rifelegance.com';

export function buildOrderConfirmationHtml(
  props: OrderConfirmationProps
): string {
  const {
    customerName,
    orderNumber,
    orderDate,
    items,
    subtotal,
    shipping,
    discount,
    total,
    currency,
    shippingAddress,
    estimatedDelivery,
    orderId,
  } = props;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${SITE_URL}/order-confirmation?order_id=${orderId || orderNumber}`)}`;

  const itemsHtml = items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 0;vertical-align:top;width:60px;">
          ${
            item.image
              ? `<img src="${esc(item.image)}" alt="${esc(item.name)}" width="50" height="50" style="border-radius:8px;object-fit:cover;" />`
              : `<div style="width:50px;height:50px;background:#f0f4e8;border-radius:8px;text-align:center;line-height:50px;font-size:24px;">🧺</div>`
          }
        </td>
        <td style="padding:10px 12px;vertical-align:top;">
          <div style="color:#333;font-size:14px;font-weight:500;">
            <a href="${SITE_URL}/products/${item.productId || ''}" style="color:#4f5f31;text-decoration:none;">${esc(item.name)}</a>
          </div>
          <div style="color:#999;font-size:12px;margin-top:2px;">Quantité: ${item.quantity}</div>
        </td>
        <td style="padding:10px 0;text-align:right;vertical-align:top;width:100px;">
          <div style="color:#333;font-size:14px;font-weight:600;">${formatPrice(item.price * item.quantity, currency)}</div>
        </td>
      </tr>`
    )
    .join('');

  const discountRow =
    discount > 0
      ? `<tr>
          <td style="color:#4f5f31;font-size:14px;padding:4px 0;">Réduction</td>
          <td style="color:#4f5f31;font-size:14px;font-weight:500;text-align:right;padding:4px 0;">-${formatPrice(discount, currency)}</td>
        </tr>`
      : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Ubuntu,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f9fc;">
<tr><td align="center" style="padding:20px 0 48px;">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;max-width:600px;width:100%;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

  <!-- Header -->
  <tr><td style="padding:32px 40px;background-color:#4f5f31;text-align:center;">
    <a href="${SITE_URL}" style="text-decoration:none;">
      <div style="color:#ffffff;font-size:28px;font-weight:bold;margin:0 0 4px;">🌿 Rif Raw Straw</div>
      <div style="color:#c4d4a5;font-size:14px;">Artisanat Berbère Authentique</div>
    </a>
  </td></tr>

  <!-- Hero -->
  <tr><td style="padding:40px;text-align:center;background-color:#f0f4e8;">
    <div style="color:#4f5f31;font-size:24px;font-weight:bold;margin:0 0 12px;">Merci pour votre commande !</div>
    <div style="color:#555;font-size:16px;line-height:24px;">Bonjour ${esc(customerName)}, nous avons bien reçu votre commande et nous la préparons avec soin.</div>
    <div style="margin-top:20px;">
      <a href="${SITE_URL}/payment-success?session_id=${orderId || orderNumber}" style="display:inline-block;background-color:#4f5f31;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">Voir ma commande</a>
    </div>
  </td></tr>

  <!-- Order Info -->
  <tr><td style="padding:24px 40px;background-color:#fafafa;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="text-align:center;padding:0 8px;">
          <div style="color:#999;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Nº commande</div>
          <div style="color:#333;font-size:14px;font-weight:600;">#${esc(orderNumber)}</div>
        </td>
        <td style="text-align:center;padding:0 8px;">
          <div style="color:#999;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Date</div>
          <div style="color:#333;font-size:14px;font-weight:600;">${esc(orderDate)}</div>
        </td>
        <td style="text-align:center;padding:0 8px;">
          <div style="color:#999;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Livraison estimée</div>
          <div style="color:#333;font-size:14px;font-weight:600;">${esc(estimatedDelivery)}</div>
        </td>
      </tr>
    </table>
  </td></tr>

  <tr><td><hr style="border:none;border-top:1px solid #e6e6e6;margin:0;" /></td></tr>

  <!-- Items -->
  <tr><td style="padding:32px 40px;">
    <div style="color:#333;font-size:18px;font-weight:600;margin:0 0 20px;">Récapitulatif de votre commande</div>
    <table width="100%" cellpadding="0" cellspacing="0">${itemsHtml}</table>
  </td></tr>

  <tr><td><hr style="border:none;border-top:1px solid #e6e6e6;margin:0;" /></td></tr>

  <!-- Summary -->
  <tr><td style="padding:24px 40px;background-color:#fafafa;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="color:#666;font-size:14px;padding:4px 0;">Sous-total</td>
        <td style="color:#333;font-size:14px;text-align:right;padding:4px 0;">${formatPrice(subtotal, currency)}</td>
      </tr>
      ${discountRow}
      <tr>
        <td style="color:#666;font-size:14px;padding:4px 0;">Livraison</td>
        <td style="color:#333;font-size:14px;text-align:right;padding:4px 0;">${shipping === 0 ? 'Gratuite' : formatPrice(shipping, currency)}</td>
      </tr>
      <tr><td colspan="2"><hr style="border:none;border-top:1px solid #ddd;margin:12px 0;" /></td></tr>
      <tr>
        <td style="color:#333;font-size:16px;font-weight:600;padding:4px 0;">Total</td>
        <td style="color:#4f5f31;font-size:18px;font-weight:bold;text-align:right;padding:4px 0;">${formatPrice(total, currency)}</td>
      </tr>
    </table>
  </td></tr>

  <tr><td><hr style="border:none;border-top:1px solid #e6e6e6;margin:0;" /></td></tr>

  <!-- Shipping Address -->
  <tr><td style="padding:32px 40px;">
    <div style="color:#333;font-size:18px;font-weight:600;margin:0 0 12px;">Adresse de livraison</div>
    <div style="color:#555;font-size:14px;line-height:22px;">
      ${esc(shippingAddress.address)}<br/>
      ${esc(shippingAddress.postalCode)} ${esc(shippingAddress.city)}<br/>
      ${esc(shippingAddress.country)}
    </div>
  </td></tr>

  <tr><td><hr style="border:none;border-top:1px solid #e6e6e6;margin:0;" /></td></tr>

  <!-- Next Steps -->
  <tr><td style="padding:32px 40px;">
    <div style="color:#333;font-size:18px;font-weight:600;margin:0 0 20px;">Prochaines étapes</div>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="width:40px;vertical-align:top;font-size:24px;padding-bottom:16px;">📦</td>
        <td style="vertical-align:top;padding-bottom:16px;">
          <div style="color:#333;font-size:14px;font-weight:600;">Préparation</div>
          <div style="color:#666;font-size:13px;">Nos artisans préparent votre commande avec le plus grand soin</div>
        </td>
      </tr>
      <tr>
        <td style="width:40px;vertical-align:top;font-size:24px;padding-bottom:16px;">🚚</td>
        <td style="vertical-align:top;padding-bottom:16px;">
          <div style="color:#333;font-size:14px;font-weight:600;">Expédition</div>
          <div style="color:#666;font-size:13px;">Vous recevrez un email avec le numéro de suivi dès l'expédition</div>
        </td>
      </tr>
      <tr>
        <td style="width:40px;vertical-align:top;font-size:24px;">🎁</td>
        <td style="vertical-align:top;">
          <div style="color:#333;font-size:14px;font-weight:600;">Livraison</div>
          <div style="color:#666;font-size:13px;">Profitez de vos produits artisanaux fabriqués à la main !</div>
        </td>
      </tr>
    </table>
  </td></tr>

  <tr><td><hr style="border:none;border-top:1px solid #e6e6e6;margin:0;" /></td></tr>

  <!-- QR Code & Digital Invoice -->
  <tr><td style="padding:32px 40px;text-align:center;background-color:#f0f4e8;">
    <div style="color:#333;font-size:16px;font-weight:600;margin:0 0 12px;">📱 Votre facture digitale</div>
    <div style="color:#666;font-size:13px;margin:0 0 16px;line-height:20px;">Scannez ce QR code pour accéder à votre facture en ligne et la télécharger en PDF.</div>
    <img src="${qrCodeUrl}" alt="QR Code facture" width="120" height="120" style="border-radius:8px;border:4px solid #ffffff;" />
    <div style="margin-top:12px;">
      <a href="${SITE_URL}/payment-success?session_id=${orderId || orderNumber}" style="color:#4f5f31;font-size:13px;text-decoration:underline;">Accéder à ma facture en ligne</a>
    </div>
  </td></tr>

  <tr><td><hr style="border:none;border-top:1px solid #e6e6e6;margin:0;" /></td></tr>

  <!-- Quick Links -->
  <tr><td style="padding:28px 40px;">
    <div style="color:#333;font-size:16px;font-weight:600;margin:0 0 16px;text-align:center;">Liens utiles</div>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="text-align:center;padding:6px 4px;">
          <a href="${SITE_URL}/products" style="color:#4f5f31;font-size:13px;text-decoration:none;font-weight:500;">🛍 Boutique</a>
        </td>
        <td style="text-align:center;padding:6px 4px;">
          <a href="${SITE_URL}/contact" style="color:#4f5f31;font-size:13px;text-decoration:none;font-weight:500;">📧 Contact</a>
        </td>
        <td style="text-align:center;padding:6px 4px;">
          <a href="${SITE_URL}/orders" style="color:#4f5f31;font-size:13px;text-decoration:none;font-weight:500;">📋 Mes commandes</a>
        </td>
      </tr>
    </table>
  </td></tr>

  <tr><td><hr style="border:none;border-top:1px solid #e6e6e6;margin:0;" /></td></tr>

  <!-- Legal Links -->
  <tr><td style="padding:20px 40px;text-align:center;background-color:#fafafa;">
    <div style="margin-bottom:8px;">
      <a href="${SITE_URL}/cgv" style="color:#888;font-size:12px;text-decoration:none;margin:0 8px;">Conditions Générales de Vente</a>
      <span style="color:#ddd;">|</span>
      <a href="${SITE_URL}/terms" style="color:#888;font-size:12px;text-decoration:none;margin:0 8px;">Politique de Confidentialité (RGPD)</a>
    </div>
    <div>
      <a href="${SITE_URL}/returns" style="color:#888;font-size:12px;text-decoration:none;margin:0 8px;">Retours & Remboursements</a>
      <span style="color:#ddd;">|</span>
      <a href="${SITE_URL}/shipping" style="color:#888;font-size:12px;text-decoration:none;margin:0 8px;">Politique de Livraison</a>
    </div>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:28px 40px;background-color:#f6f9fc;text-align:center;border-radius:0 0 12px 12px;">
    <div style="color:#999;font-size:13px;margin-bottom:8px;">
      Une question ? <a href="${SITE_URL}/contact" style="color:#4f5f31;font-weight:500;">Contactez-nous</a> ou écrivez à <a href="mailto:contact@rifrawstraw.com" style="color:#4f5f31;">contact@rifrawstraw.com</a>
    </div>
    <div style="color:#bbb;font-size:12px;margin-bottom:4px;">© ${new Date().getFullYear()} Rif Raw Straw — Artisanat Berbère Authentique</div>
    <div style="color:#ccc;font-size:11px;">Fabriqué à la main dans les montagnes du Rif</div>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}
