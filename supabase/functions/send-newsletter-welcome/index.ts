import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';

const FROM_NAME = 'Rif Straw';
const FROM_EMAIL_FALLBACK = 'contact@rif-elegance.com';

const getFromEmail = (): string => {
  const raw = Deno.env.get('RESEND_FROM_EMAIL');
  console.log('RESEND_FROM_EMAIL raw value:', raw);
  if (!raw) return FROM_EMAIL_FALLBACK;
  const match = raw.match(/<([^>]+)>/);
  const result = match ? match[1].trim() : raw.trim();
  console.log('Parsed FROM_EMAIL:', result);
  return result || FROM_EMAIL_FALLBACK;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const generateWelcomeHtml = (email: string): string => `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <!-- Header -->
        <tr><td style="text-align:center;padding-bottom:32px;">
          <h1 style="margin:0;font-size:28px;color:#2d5016;font-weight:700;">🌿 Rif Raw Straw</h1>
          <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">Authentic Berber Craftsmanship</p>
        </td></tr>

        <!-- Welcome message -->
        <tr><td style="background-color:#f0f5eb;border-radius:12px;padding:32px;">
          <h2 style="margin:0 0 16px;font-size:22px;color:#1a1a1a;text-align:center;">
            Bienvenue dans notre communauté ! 🎉
          </h2>
          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
            Merci de vous être inscrit(e) à notre newsletter. Vous recevrez en avant-première nos nouveautés,
            offres spéciales et les histoires de nos artisans berbères.
          </p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
            Chaque pièce que nous proposons est tissée à la main dans les montagnes du Rif,
            perpétuant un savoir-faire ancestral transmis de génération en génération.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="https://rif-raw-straw.lovable.app/products"
                 style="display:inline-block;background-color:#2d5016;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">
                Découvrir nos produits
              </a>
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding-top:32px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
            Vous recevez cet email car vous vous êtes inscrit(e) sur rifrawstraw.com.<br/>
            <a href="https://rif-raw-straw.lovable.app" style="color:#2d5016;text-decoration:underline;">Visiter le site</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`;

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (!BREVO_API_KEY) {
      console.error('BREVO_API_KEY is not set');
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
    const FROM_EMAIL = getFromEmail();
    const htmlContent = generateWelcomeHtml(email);
    const subject = 'Bienvenue chez Rif Straw ! 🌿';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: FROM_NAME, email: FROM_EMAIL },
          to: [{ email }],
          subject,
          htmlContent,
        }),
        signal: controller.signal,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(`Brevo error (${res.status}): ${JSON.stringify(data)}`);
      }

      console.log(`Newsletter welcome email sent to ${email}`, data);

      return new Response(
        JSON.stringify({ success: true, messageId: data.messageId }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    } finally {
      clearTimeout(timeout);
    }
  } catch (error: any) {
    console.error('Error sending newsletter welcome email:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
