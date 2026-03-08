import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const FROM_NAME = 'Rif Straw';
const FROM_EMAIL_FALLBACK = 'contact@rif-elegance.com';

const getSiteUrl = (): string => {
  const url = Deno.env.get('SITE_URL') || 'https://www.rif-elegance.com';
  return url.replace(/\/+$/, '');
};

const getFromEmail = (): string => {
  const raw = Deno.env.get('RESEND_FROM_EMAIL');
  if (!raw) return FROM_EMAIL_FALLBACK;
  const match = raw.match(/<([^>]+)>/);
  return match ? match[1].trim() : raw.trim() || FROM_EMAIL_FALLBACK;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const generateAbandonedCartHtml = (
  items: any[],
  personalInfo: any,
  sessionId: string
): string => {
  const siteUrl = getSiteUrl();
  const firstName = personalInfo?.firstName || personalInfo?.first_name || 'Client';
  const itemsHtml = (items || [])
    .slice(0, 5)
    .map(
      (item: any) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;font-size:14px;color:#374151;">
          ${item.name || item.product_name || 'Produit artisanal'} × ${item.quantity || 1}
        </td>
        <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;font-size:14px;color:#374151;text-align:right;">
          ${(item.price || 0).toFixed(2)} €
        </td>
      </tr>`
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="text-align:center;padding-bottom:32px;">
          <h1 style="margin:0;font-size:28px;color:#2d5016;font-weight:700;">🌿 Rif Raw Straw</h1>
          <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">Authentic Berber Craftsmanship</p>
        </td></tr>

        <tr><td style="background-color:#f0f5eb;border-radius:12px;padding:32px;">
          <h2 style="margin:0 0 16px;font-size:22px;color:#1a1a1a;text-align:center;">
            Vous avez oublié quelque chose ? 🧺
          </h2>
          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
            Bonjour ${firstName},<br/>
            Vous avez laissé des articles artisanaux dans votre panier. 
            Chaque pièce est fabriquée à la main et en quantité limitée — ne les manquez pas !
          </p>

          ${
            itemsHtml
              ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">${itemsHtml}</table>`
              : ''
          }

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
            <tr><td align="center">
              <a href="${siteUrl}/checkout"
                 style="display:inline-block;background-color:#2d5016;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">
                Finaliser ma commande
              </a>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding-top:32px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
            Cet email a été envoyé car vous avez commencé une commande sur rifrawstraw.com.<br/>
            <a href="https://rif-raw-straw.lovable.app" style="color:#2d5016;text-decoration:underline;">Visiter le site</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
    if (!BREVO_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'BREVO_API_KEY not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find sessions abandoned > 1 hour ago, not yet emailed
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: sessions, error: fetchError } = await supabase
      .from('checkout_sessions')
      .select('*')
      .eq('status', 'in_progress')
      .lt('updated_at', oneHourAgo)
      .gt('updated_at', twentyFourHoursAgo)
      .not('personal_info', 'is', null)
      .gte('last_completed_step', 1)
      .limit(20);

    if (fetchError) throw fetchError;

    console.log(`Found ${sessions?.length || 0} abandoned carts to process`);

    const results = [];
    const FROM_EMAIL = getFromEmail();

    for (const session of sessions || []) {
      const personalInfo = session.personal_info as any;
      const email = personalInfo?.email;
      if (!email) continue;

      // Check if we already sent an abandoned cart email for this session
      const { data: existingLog } = await supabase
        .from('email_logs')
        .select('id')
        .eq('template_name', 'abandoned-cart')
        .eq('recipient_email', email)
        .gte('created_at', twentyFourHoursAgo)
        .limit(1);

      if (existingLog && existingLog.length > 0) {
        console.log(`Already emailed ${email} for abandoned cart, skipping`);
        continue;
      }

      const cartItems = session.cart_items as any[];
      const htmlContent = generateAbandonedCartHtml(cartItems, personalInfo, session.id);

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': BREVO_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sender: { name: FROM_NAME, email: FROM_EMAIL },
            to: [{ email, name: personalInfo?.firstName || '' }],
            subject: 'Votre panier vous attend ! 🧺',
            htmlContent,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);
        const data = await res.json();

        if (!res.ok) throw new Error(`Brevo error: ${JSON.stringify(data)}`);

        // Log the email
        await supabase.from('email_logs').insert({
          template_name: 'abandoned-cart',
          recipient_email: email,
          recipient_name: personalInfo?.firstName || null,
          status: 'sent',
          sent_at: new Date().toISOString(),
          metadata: { session_id: session.id, cart_items_count: cartItems?.length || 0 },
        });

        // Mark session as abandoned
        await supabase
          .from('checkout_sessions')
          .update({ status: 'abandoned', abandoned_at: new Date().toISOString() })
          .eq('id', session.id);

        results.push({ session_id: session.id, email, status: 'sent' });
        console.log(`Abandoned cart email sent to ${email}`);
      } catch (emailError: any) {
        console.error(`Failed to send to ${email}:`, emailError.message);
        results.push({ session_id: session.id, email, status: 'failed', error: emailError.message });
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: results.length, results }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error: any) {
    console.error('Error in send-abandoned-cart-email:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
