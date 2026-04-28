import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/** Comma-separated override; default notifies both inboxes below. */
const DEFAULT_CONTACT_NOTIFY_EMAILS = [
  'contact@rif-elegance.com',
  'benyakoub.fr@gmail.com',
] as const;

const FROM_NAME = 'Rif Straw — Contact';

const parseFromEmail = (raw: string | undefined): string => {
  if (!raw) return 'contact@rif-elegance.com';
  const match = raw.match(/<([^>]+)>/);
  return match ? match[1].trim() : raw.trim();
};

function getContactNotifyRecipientsFromEnv(): string[] {
  const raw = Deno.env.get('CONTACT_FORM_NOTIFY_EMAILS')?.trim();
  if (raw) {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [...DEFAULT_CONTACT_NOTIFY_EMAILS];
}

const NOTIFY_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Parse comma-separated list; keep only plausible emails (same cap as single-field validation). */
function parseNotifyEmailList(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(
      (e) => e.length > 0 && e.length <= 254 && NOTIFY_EMAIL_REGEX.test(e)
    );
}

/**
 * Recipients for Brevo notification, in order:
 * 1. `site_settings.contactFormNotifyEmails` in `app_settings` (non-empty, at least one valid email)
 * 2. `CONTACT_FORM_NOTIFY_EMAILS` env
 * 3. Built-in defaults
 */
async function resolveContactNotifyRecipients(
  supabaseClient: ReturnType<typeof createClient>
): Promise<string[]> {
  try {
    const { data, error } = await supabaseClient
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'site_settings')
      .maybeSingle();

    if (error || data?.setting_value == null) {
      return getContactNotifyRecipientsFromEnv();
    }

    const blob = data.setting_value as Record<string, unknown>;
    const rawFromDb = blob.contactFormNotifyEmails;
    if (typeof rawFromDb === 'string' && rawFromDb.trim()) {
      const valid = parseNotifyEmailList(rawFromDb);
      if (valid.length > 0) return valid;
    }
  } catch (e) {
    console.warn(
      '[submit-contact] Could not read contactFormNotifyEmails from app_settings',
      e
    );
  }
  return getContactNotifyRecipientsFromEnv();
}

async function sendContactNotificationEmail(params: {
  sanitized: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    company: string | null;
    subject: string;
    message: string;
  };
  notifyTo: string[];
  replyToEmail: string;
  replyToName: string;
  ip_address: string;
}): Promise<void> {
  const apiKey = Deno.env.get('BREVO_API_KEY');
  if (!apiKey) {
    console.warn(
      '[submit-contact] BREVO_API_KEY not set; skipping notification email'
    );
    return;
  }

  const { sanitized, notifyTo, replyToEmail, replyToName, ip_address } = params;
  const to = notifyTo;
  if (to.length === 0) return;

  const fromEmail = parseFromEmail(Deno.env.get('RESEND_FROM_EMAIL'));
  const subjectLine = `[Contact] ${sanitized.subject}`.slice(0, 200);

  const html = `
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"></head>
<body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111;">
  <h2 style="margin:0 0 12px;">New contact form message</h2>
  <table style="border-collapse:collapse;max-width:560px;">
    <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Name</td><td>${sanitized.first_name} ${sanitized.last_name}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Email</td><td><a href="mailto:${sanitized.email}">${sanitized.email}</a></td></tr>
    ${sanitized.phone ? `<tr><td style="padding:4px 12px 4px 0;font-weight:600;">Phone</td><td>${sanitized.phone}</td></tr>` : ''}
    ${sanitized.company ? `<tr><td style="padding:4px 12px 4px 0;font-weight:600;">Company</td><td>${sanitized.company}</td></tr>` : ''}
    <tr><td style="padding:4px 12px 4px 0;font-weight:600;vertical-align:top;">Subject</td><td>${sanitized.subject}</td></tr>
  </table>
  <p style="font-weight:600;margin:16px 0 8px;">Message</p>
  <pre style="white-space:pre-wrap;background:#f4f4f5;padding:12px;border-radius:8px;font-size:14px;">${sanitized.message}</pre>
  <p style="font-size:12px;color:#666;margin-top:24px;">IP: ${ip_address}</p>
</body></html>`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: FROM_NAME, email: fromEmail },
        to: to.map((email) => ({ email })),
        subject: subjectLine,
        htmlContent: html,
        replyTo: {
          email: replyToEmail,
          name: replyToName.slice(0, 100) || replyToEmail,
        },
      }),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('[submit-contact] Brevo error', res.status, data);
      return;
    }
    console.log('[submit-contact] Notification email sent', data);
  } finally {
    clearTimeout(timeout);
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

// Input validation functions
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

const validateName = (name: string): boolean => {
  const nameRegex = /^[a-zA-ZÀ-ÿ\s'-]+$/;
  return nameRegex.test(name) && name.length >= 2 && name.length <= 50;
};

const validatePhone = (phone: string): boolean => {
  // Allow phones starting with 0 (common in France/Europe) or with country code
  const cleanPhone = phone.replace(/[\s().-]/g, '');
  if (cleanPhone.length === 0) return true; // Empty is valid (optional field)
  const phoneRegex = /^[+]?[0-9]{6,17}$/;
  return phoneRegex.test(cleanPhone);
};

/**
 * HTML escape special characters to prevent XSS
 */
const htmlEscape = (str: string): string => {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
  };
  return str.replace(/[&<>"'`=/]/g, (char) => htmlEntities[char] || char);
};

/**
 * Comprehensive input sanitization to prevent XSS attacks
 * - Removes HTML tags completely
 * - Escapes special HTML characters
 * - Removes null bytes and control characters
 * - Limits length
 */
const sanitizeInput = (input: string, maxLength: number = 1000): string => {
  if (!input || typeof input !== 'string') return '';

  // Step 1: Trim whitespace
  let sanitized = input.trim();

  // Step 2: Remove null bytes and control characters (except newlines/tabs)
  // eslint-disable-next-line no-control-regex -- intentional strip of disallowed ASCII controls
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Step 3: Remove all HTML tags (including malformed ones)
  sanitized = sanitized.replace(/<[^>]*>?/gm, '');

  // Step 4: Remove javascript: and data: URLs that could be used in event handlers
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/data:/gi, '');
  sanitized = sanitized.replace(/vbscript:/gi, '');

  // Step 5: Remove event handlers (onclick, onerror, onload, etc.)
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');

  // Step 6: HTML-escape special characters to prevent XSS in HTML contexts
  sanitized = htmlEscape(sanitized);

  // Step 7: Limit length
  return sanitized.substring(0, maxLength);
};

/**
 * Sanitize for plain text email (more lenient, just prevent injection)
 */
const sanitizeForPlainText = (
  input: string,
  maxLength: number = 1000
): string => {
  if (!input || typeof input !== 'string') return '';

  let sanitized = input.trim();

  // Remove control characters except newlines
  // eslint-disable-next-line no-control-regex -- intentional strip of disallowed ASCII controls
  sanitized = sanitized.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Limit length
  return sanitized.substring(0, maxLength);
};

const checkRateLimit = async (
  supabaseClient: any,
  identifier: string
): Promise<boolean> => {
  try {
    const { data, error } = await supabaseClient.rpc('check_rate_limit', {
      p_identifier: identifier,
      p_action_type: 'contact_form',
      p_max_attempts: 5,
      p_window_minutes: 60,
    });

    if (error) {
      console.warn('Rate limit check failed:', error);
      return true; // Allow on error to prevent service disruption
    }

    return data === true;
  } catch (error) {
    console.warn('Rate limit error:', error);
    return true; // Allow on error
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get client info for security logging
    // X-Forwarded-For can contain multiple IPs, take the first one
    const forwardedFor = req.headers.get('x-forwarded-for') || '';
    const clientIP =
      forwardedFor.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      '0.0.0.0';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Check rate limiting
    const isAllowed = await checkRateLimit(supabaseClient, clientIP);
    if (!isAllowed) {
      // Log suspicious activity
      await supabaseClient.rpc('log_security_event', {
        p_event_type: 'CONTACT_FORM_RATE_LIMIT',
        p_severity: 'medium',
        p_event_data: JSON.stringify({
          ip_address: clientIP,
          user_agent: userAgent,
          timestamp: new Date().toISOString(),
        }),
      });

      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { firstName, lastName, email, phone, company, subject, message } =
      await req.json();

    // Validate required fields
    if (!firstName || !lastName || !email || !subject || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate input format and content
    if (!validateName(firstName) || !validateName(lastName)) {
      return new Response(JSON.stringify({ error: 'Invalid name format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!validateEmail(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (phone && !validatePhone(phone)) {
      return new Response(JSON.stringify({ error: 'Invalid phone format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Sanitize inputs with XSS protection
    const sanitizedData = {
      first_name: sanitizeInput(firstName, 50),
      last_name: sanitizeInput(lastName, 50),
      email: sanitizeInput(email, 254),
      phone: phone ? sanitizeInput(phone, 20) : null,
      company: company ? sanitizeInput(company, 100) : null,
      subject: sanitizeInput(subject, 200),
      message: sanitizeForPlainText(message, 5000), // Allow longer messages, plain text safe
      ip_address: clientIP,
      user_agent: userAgent.substring(0, 500), // Limit user agent length
    };

    // Primary persistence: every valid submission is stored in `contact_messages`
    // for admin queries / analysis. Email notification runs only after this succeeds.
    const { error } = await supabaseClient
      .from('contact_messages')
      .insert([sanitizedData]);

    if (error) {
      console.error('Database error:', error);

      // Log security event for database errors
      await supabaseClient.rpc('log_security_event', {
        p_event_type: 'CONTACT_FORM_DB_ERROR',
        p_severity: 'high',
        p_event_data: JSON.stringify({
          error_code: error.code,
          ip_address: clientIP,
          timestamp: new Date().toISOString(),
        }),
      });

      throw error;
    }

    try {
      const notifyTo = await resolveContactNotifyRecipients(supabaseClient);
      await sendContactNotificationEmail({
        sanitized: sanitizedData,
        notifyTo,
        replyToEmail: String(email).trim(),
        replyToName:
          `${String(firstName).trim()} ${String(lastName).trim()}`.trim(),
        ip_address: clientIP,
      });
    } catch (notifyErr) {
      console.error('[submit-contact] Notification email failed', notifyErr);
    }

    // Log successful submission (without sensitive data)
    console.log('Contact form submitted successfully', {
      email: email.substring(0, 3) + '***',
      subject: subject.substring(0, 10) + '...',
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Contact form submitted successfully',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
